// -----------------------------
// Task interface
// Represents a single task stored locally or on the server
// -----------------------------
export interface Task {
  id: string;                    // Unique ID for this task (UUID)
  title: string;                 // Task title
  description?: string;           // Optional task description
  completed: boolean;             // Whether the task is completed
  created_at: string;             // Creation timestamp as ISO string
  updated_at: string;             // Last update timestamp as ISO string
  is_deleted: boolean;            // Soft-delete flag
  sync_status?: 'pending' | 'synced' | 'error'; // Local sync state
  server_id?: string | null;      // Corresponding server ID, if synced
  last_synced_at?: string | null; // Timestamp of last successful sync
}

// -----------------------------
// SyncQueueItem interface
// Represents a single operation queued for syncing with the server
// -----------------------------
export interface SyncQueueItem {
  id: string;                     // Unique ID of this queue item
  taskId: string;                 // ID of the task being synced
  operation: 'create' | 'update' | 'delete'; // Type of operation
  payload: Partial<Task>;          // Task data for this operation
  status: 'pending' | 'success' | 'error'; // Current sync status
  created_at: string;              // Timestamp when this item was queued
  retry_count: number;             // Number of retry attempts
  error_message?: string;          // Optional error message if failed
}

// -----------------------------
// SyncError interface
// Represents an error encountered during sync
// -----------------------------
export interface SyncError {
  taskId: string;                  // ID of the task that caused the error
  operation: string;               // Operation attempted ('create', 'update', 'delete')
  error: string;                   // Error message
  timestamp: string;               // When the error occurred
}

// -----------------------------
// SyncResult interface
// Summary of a sync operation
// -----------------------------
export interface SyncResult {
  success: boolean;                // True if all items synced successfully
  synced_items: number;            // Number of successfully synced items
  failed_items: number;            // Number of failed items
  errors?: SyncError[];            // Optional array of detailed errors
}

// -----------------------------
// ConflictResolution interface
// Represents resolution of a sync conflict
// -----------------------------
export interface ConflictResolution {
  strategy: 'last-write-wins' | 'client-wins' | 'server-wins'; // Resolution strategy
  resolved_task: Task;             // Task after conflict resolution
}

// -----------------------------
// BatchSyncRequest interface
// Represents a batch of items being sent to the server
// -----------------------------
export interface BatchSyncRequest {
  items: SyncQueueItem[];          // Array of queued sync operations
  client_timestamp: string;        // Timestamp of client's last sync
}

// -----------------------------
// BatchSyncResponse interface
// Represents server response to a batch sync
// -----------------------------
export interface BatchSyncResponse {
  processed_items: {
    client_id: string;             // ID of the item from the client
    server_id: string | null;      // Assigned server ID, if applicable
    status: 'success' | 'conflict' | 'error'; // Result of sync
    resolved_data?: Task;           // Task data after conflict resolution, if any
    error?: string;                 // Error message if failed
  }[];
}
