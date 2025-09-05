// Importing necessary modules from Express
import { Router, Request, Response } from 'express';
// Importing the SyncService which handles task synchronization logic
import { SyncService } from '../services/syncService';
// Importing Database class to interact with SQLite database
import { Database } from '../db/database';

// Function to create and return a router for sync operations
export default function createSyncRouter(db: Database) {
  const router = Router(); // Create a new Express Router instance
  const syncService = new SyncService(db); // Initialize SyncService with the database instance

  // Define a POST route at the root ('/') of this router
  router.post('/', async (req: Request, res: Response) => {
    try {
      // Get batchSize from request body; default to 50 if not provided
      const batchSize = req.body.batchSize ?? 50;

      // Call SyncService to process the sync queue with the given batch size
      const result = await syncService.processSyncQueue(batchSize);

      // Send back a JSON response with the sync results
      res.json({
        message: 'Sync completed', // Informational message
        success: result.success,   // Number of successfully processed items
        failed: result.failed,     // Number of failed items
      });
    } catch (err) {
      // Log any errors to the server console
      console.error(err);
      // Send a 500 Internal Server Error response with a message
      res.status(500).json({ message: 'Internal Server Error' });
    }
  });

  // Return the configured router to be used in the main app
  return router;
}
