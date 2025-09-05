import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Database } from './db/database';
import createTaskRouter from './routes/tasks'; // Task routes for CRUD operations
import createSyncRouter from './routes/sync';  // Sync routes for syncing tasks with server
import { errorHandler } from './middleware/errorHandler'; // Global error handler

dotenv.config(); // Load environment variables from .env file

const app = express();
const PORT = process.env.PORT || 3000; // Default to 3000 if PORT not set

// -----------------------------
// Middleware
// -----------------------------
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // Parse incoming JSON request bodies

// -----------------------------
// Initialize Database
// -----------------------------
const db = new Database(process.env.DATABASE_URL || './data/tasks.sqlite3'); 
// Uses DATABASE_URL from env or defaults to local SQLite file

// -----------------------------
// Routes
// -----------------------------
app.use('/api/tasks', createTaskRouter(db)); // Task CRUD routes
app.use('/api', createSyncRouter(db));      // Sync-related routes (e.g., /api/sync)

// -----------------------------
// Global Error Handler
// -----------------------------
app.use(errorHandler); // Handles errors thrown in routes and middleware

// -----------------------------
// Start Server
// -----------------------------
async function start() {
  try {
    await db.initialize(); // Ensure tables exist and database is ready
    console.log('Database initialized');

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1); // Exit if initialization fails
  }
}

start();

// -----------------------------
// Graceful Shutdown
// -----------------------------
// Handle SIGTERM (used by Kubernetes, Docker, etc.)
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await db.close(); // Close DB connections
  process.exit(0);
});

// Handle SIGINT 
process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await db.close(); // Close DB connections
  process.exit(0);
});
