import { v4 as uuidv4 } from 'uuid'; // Used to generate unique IDs for tasks and sync queue items
import sqlite3 from 'sqlite3'; // SQLite3 DB driver for local storage
import { SyncQueueItem } from '../types'; // TypeScript interface for sync queue items

const sqlite = sqlite3.verbose(); // Enable verbose mode for better debugging

export class Database {
  private db: sqlite3.Database;

  constructor(filename: string = ':memory:') {
    // Initialize database connection
    // Default filename ':memory:' creates a temporary in-memory DB (good for testing)
    this.db = new sqlite.Database(filename);
  }

  async initialize(): Promise<void> {
    // Called once at startup to ensure tables exist
    await this.createTables();
  }

  private async createTables(): Promise<void> {
    // SQL query to create 'tasks' table if it does not exist
    // Stores main task data
    const createTasksTable = `
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,               -- Unique task ID
        title TEXT NOT NULL,               -- Task title
        description TEXT,                  -- Optional task description
        completed INTEGER DEFAULT 0,       -- 0=false, 1=true
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- Auto timestamp on creation
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- Auto timestamp on update
        is_deleted INTEGER DEFAULT 0,      -- Soft delete flag
        sync_status TEXT DEFAULT 'pending',-- Tracks if task is synced
        server_id TEXT,                    -- Remote server ID (if synced)
        last_synced_at DATETIME            -- Timestamp of last successful sync
      )
    `;

    // SQL query to create 'sync_queue' table if it does not exist
    // Stores offline actions to be synced to server later
    const createSyncQueueTable = `
      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,               -- Unique queue item ID
        task_id TEXT NOT NULL,             -- Related task ID
        operation TEXT NOT NULL,           -- 'create' | 'update' | 'delete'
        data TEXT NOT NULL,                -- JSON payload of task data
        status TEXT DEFAULT 'pending',     -- 'pending' | 'success' | 'error'
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- When this queue item was created
        retry_count INTEGER DEFAULT 0,     -- Number of retry attempts
        error_message TEXT,                -- Stores error info if sync fails
        last_attempt DATETIME,             -- Timestamp of last sync attempt
        FOREIGN KEY (task_id) REFERENCES tasks(id) -- Link to tasks table
      )
    `;

    // Run the SQL queries to create tables
    await this.run(createTasksTable);
    await this.run(createSyncQueueTable);
  }

  // Generic helper to run a SQL statement that does not return rows
  run(sql: string, params: unknown[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, (err) => (err ? reject(err) : resolve()));
    });
  }

  // Helper to get a single row from the database
  get(sql: string, params: unknown[] = []): Promise<Record<string, unknown> | undefined> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row as Record<string, unknown> | undefined)));
    });
  }

  // Helper to get multiple rows from the database
  all(sql: string, params: unknown[] = []): Promise<Record<string, unknown>[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows as Record<string, unknown>[])));
    });
  }

  // Close the database connection gracefully
  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => (err ? reject(err) : resolve()));
    });
  }

  // --- Sync Queue Management ---

  // Add a task operation to the sync queue for offline-first behavior
  async addToSyncQueue(taskId: string, operation: 'create' | 'update' | 'delete', payload: unknown) {
    const id = uuidv4(); // Generate unique ID for queue item
    await this.run(
      `INSERT INTO sync_queue (id, task_id, operation, data) VALUES (?, ?, ?, ?)`,
      [id, taskId, operation, JSON.stringify(payload)] // Store task payload as JSON
    );
  }

  // Fetch a batch of pending sync queue items
  async getSyncQueue(batchSize: number = 50): Promise<SyncQueueItem[]> {
    // Select pending items ordered by creation time to maintain correct operation order
    const rows = await this.all(
      `SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY created_at ASC LIMIT ?`,
      [batchSize]
    );

    // Convert database rows to SyncQueueItem objects
    return rows.map((row) => ({
      id: row.id as string,
      taskId: row.task_id as string,
      operation: row.operation as 'create' | 'update' | 'delete',
      payload: JSON.parse(row.data as string),
      status: row.status as 'pending' | 'success' | 'error',
      created_at: row.created_at as string,
      retry_count: row.retry_count as number,
      lastAttempt: row.last_attempt ? new Date(row.last_attempt as string) : undefined,
      error_message: row.error_message as string | undefined,
    }));
  }

  // Update sync queue item status after attempting to sync
  async updateSyncStatus(
    id: string,
    status: 'pending' | 'success' | 'error',
    errorMessage?: string
  ) {
    const now = new Date().toISOString();
    await this.run(
      `UPDATE sync_queue SET status = ?, last_attempt = ?, retry_count = retry_count + 1, error_message = ? WHERE id = ?`,
      [status, now, errorMessage || null, id] // Track retries and last attempt time
    );
  }
}
