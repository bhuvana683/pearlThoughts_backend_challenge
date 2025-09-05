// Import Database class for interacting with SQLite
import { Database } from '../db/database';
// Import axios for making HTTP requests to remote server
import axios from 'axios';

/**
 * Service for synchronizing local changes with a remote server
 */
export class SyncService {
  // Database instance is prefixed with _ to suppress unused warning
  constructor(private _db: Database) {}

  // -----------------------------
  // Check if the remote server is online
  // -----------------------------
  async checkConnectivity(): Promise<boolean> {
    try {
      // Make a GET request to a health check endpoint on remote server
      await axios.get('https://example.com/health'); // Replace with actual server URL
      return true; // Server is reachable
    } catch {
      return false; // Server is unreachable
    }
  }

  // -----------------------------
  // Add an operation to the sync queue in the database
  // -----------------------------
  async addToSyncQueue(
    taskId: string, // ID of the task to sync
    operation: string, // Type of operation: 'create', 'update', 'delete'
    data?: Record<string, unknown> // Optional data related to the operation
  ) {
    // Insert a new row into sync_queue table
    await this._db.run(
      'INSERT INTO sync_queue (task_id, operation, data, created_at) VALUES (?, ?, ?, ?)',
      [taskId, operation, JSON.stringify(data || {}), new Date().toISOString()]
    );
  }

  // -----------------------------
  // Sync all queued operations with remote server
  // -----------------------------
  async sync(): Promise<{
    success: boolean; // True if all items synced successfully
    synced_items: number; // Number of successfully synced items
    failed_items: number; // Number of failed items
  }> {
    // Fetch all rows from sync_queue
    const queue = (await this._db.all(
      'SELECT * FROM sync_queue'
    )) as { id: string; task_id: string; operation: string; data: string }[];

    let successCount = 0;
    let failCount = 0;

    for (const item of queue) {
      try {
        // Send data to remote server via POST request
        await axios.post('https://example.com/sync', JSON.parse(item.data));
        successCount++; // Increment success count if request succeeds
      } catch (err) {
        console.error(`Failed to sync task ${item.task_id}:`, err);
        failCount++; // Increment fail count if request fails
      }
    }

    // Return sync result summary
    return {
      success: failCount === 0,
      synced_items: successCount,
      failed_items: failCount,
    };
  }

  // -----------------------------
  // Process sync queue in batches
  // Useful for limiting number of items sent to server at once
  // -----------------------------
  async processSyncQueue(batchSize: number) {
    // Fetch a limited number of queued items from database
    const queue = (await this._db.all(
      'SELECT * FROM sync_queue LIMIT ?',
      [batchSize]
    )) as { id: string; task_id: string; operation: string; data: string }[];

    const failed: string[] = []; // Store IDs of failed tasks

    for (const item of queue) {
      try {
        // Send each task to remote server
        await axios.post('https://example.com/sync', JSON.parse(item.data));
      } catch (err) {
        console.error(`Failed to sync task ${item.task_id} in batch:`, err);
        failed.push(item.task_id); // Track failed task
      }
    }

    // Return result for this batch
    return {
      success: failed.length === 0,
      failed, // Array of failed task IDs
    };
  }
}
