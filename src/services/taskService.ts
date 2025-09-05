import { Database } from '../db/database';
import { Task } from '../types';
import { v4 as uuidv4 } from 'uuid';

// DB row type for internal database representation
type TaskRow = {
  id: string;
  title: string;
  description: string;
  completed: number;       // 0 = false, 1 = true
  is_deleted: number;      // 0 = false, 1 = true
  sync_status: 'pending' | 'synced' | 'error';
  created_at: string;
  updated_at: string;
};

export class TaskService {
  constructor(private db: Database) {} // Inject database instance

  // -----------------------------
  // Create a new task
  // -----------------------------
  async createTask(taskData: Partial<Task>): Promise<Task> {
    const id = uuidv4(); // Generate unique ID
    const now = new Date().toISOString();

    const task: Task = {
      id,
      title: String(taskData.title),      // Ensure title is string
      description: taskData.description ?? '',
      completed: taskData.completed ?? false,
      is_deleted: false,
      sync_status: 'pending',             // Newly created task needs sync
      created_at: now,
      updated_at: now,
    };

    // Insert task into tasks table
    await this.db.run(
      `INSERT INTO tasks
      (id, title, description, completed, is_deleted, sync_status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [task.id, task.title, task.description, task.completed ? 1 : 0, 0, task.sync_status, task.created_at, task.updated_at]
    );

    // Add creation operation to sync_queue for syncing with remote server
    await this.db.run(
      `INSERT INTO sync_queue (task_id, operation, data, created_at) VALUES (?, ?, ?, ?)`,
      [task.id, 'create', JSON.stringify(task), now]
    );

    return task;
  }

  // -----------------------------
  // Get a task by ID
  // -----------------------------
  async getTask(id: string): Promise<Task | null> {
    const row = (await this.db.get(
      'SELECT * FROM tasks WHERE id = ?',
      [id]
    )) as TaskRow | undefined;

    if (!row) return null;

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      completed: !!row.completed,
      is_deleted: !!row.is_deleted,
      sync_status: row.sync_status,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  // -----------------------------
  // Get all non-deleted tasks
  // -----------------------------
  async getAllTasks(): Promise<Task[]> {
    const rows = (await this.db.all(
      'SELECT * FROM tasks WHERE is_deleted = 0'
    )) as TaskRow[];

    return rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      completed: !!row.completed,
      is_deleted: !!row.is_deleted,
      sync_status: row.sync_status,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  }

  // -----------------------------
  // Update a task by ID
  // -----------------------------
  async updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
    const existing = await this.getTask(id);
    if (!existing || existing.is_deleted) return null;

    const updatedTask: Task = {
      ...existing,
      title: updates.title ?? existing.title,
      description: updates.description ?? existing.description,
      completed: updates.completed ?? existing.completed,
      updated_at: new Date().toISOString(),
      sync_status: 'pending', // Mark as pending to sync with server
    };

    // Update task in tasks table
    await this.db.run(
      `UPDATE tasks SET title=?, description=?, completed=?, updated_at=?, sync_status=? WHERE id=?`,
      [updatedTask.title, updatedTask.description, updatedTask.completed ? 1 : 0, updatedTask.updated_at, updatedTask.sync_status, id]
    );

    // Add update operation to sync_queue
    await this.db.run(
      `INSERT INTO sync_queue (task_id, operation, data, created_at) VALUES (?, ?, ?, ?)`,
      [id, 'update', JSON.stringify(updatedTask), updatedTask.updated_at]
    );

    return updatedTask;
  }

  // -----------------------------
  // Soft-delete a task by ID
  // -----------------------------
  async deleteTask(id: string): Promise<boolean> {
    const existing = await this.getTask(id);
    if (!existing || existing.is_deleted) return false;

    const now = new Date().toISOString();

    // Mark task as deleted and pending sync
    await this.db.run(
      'UPDATE tasks SET is_deleted=1, updated_at=?, sync_status=? WHERE id=?',
      [now, 'pending', id]
    );

    // Add delete operation to sync_queue
    await this.db.run(
      'INSERT INTO sync_queue (task_id, operation, data, created_at) VALUES (?, ?, ?, ?)',
      [id, 'delete', JSON.stringify({ id }), now]
    );

    return true;
  }

  // -----------------------------
  // Get all tasks that need syncing (pending or error)
  // -----------------------------
  async getTasksNeedingSync(): Promise<Task[]> {
    const rows = (await this.db.all(
      'SELECT * FROM tasks WHERE sync_status IN (?, ?)',
      ['pending', 'error']
    )) as TaskRow[];

    return rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      completed: !!row.completed,
      is_deleted: !!row.is_deleted,
      sync_status: row.sync_status,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  }
}
