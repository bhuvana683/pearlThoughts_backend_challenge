// Importing necessary modules from Express
import { Router, Request, Response } from 'express';
// Import TaskService which handles all task CRUD operations
import { TaskService } from '../services/taskService';
// Import Database class for database interactions
import { Database } from '../db/database';

/**
 * Task router factory
 * @param db Database instance
 * @returns Express Router for task CRUD operations
 */
export default function createTaskRouter(db: Database) {
  const router = Router(); // Create a new Express router instance
  const taskService = new TaskService(db); // Initialize TaskService with the database

  // -----------------------------
  // Create a new task
  // -----------------------------
  router.post('/', async (req: Request, res: Response) => {
    try {
      // Call TaskService to create a new task with data from request body
      const task = await taskService.createTask(req.body);
      // Return 201 Created response with the new task
      return res.status(201).json(task);
    } catch (err) {
      console.error(err);
      // Return 500 Internal Server Error if something goes wrong
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  });

  // -----------------------------
  // Get all tasks
  // -----------------------------
  router.get('/', async (_req, res) => {
    try {
      // Fetch all tasks from TaskService
      const tasks = await taskService.getAllTasks();
      // Return tasks as JSON
      return res.json(tasks);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  });

  // -----------------------------
  // Pretty-print all tasks for browser
  // -----------------------------
  router.get('/pretty', async (_req, res) => {
    try {
      const tasks = await taskService.getAllTasks();
      // Set Content-Type header to JSON
      res.setHeader('Content-Type', 'application/json');
      // Send JSON with 2-space indentation for readability
      res.send(JSON.stringify(tasks, null, 2));
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  });

  // -----------------------------
  // Get a single task by ID
  // -----------------------------
  router.get('/:id', async (req, res) => {
    try {
      // Fetch task by ID from TaskService
      const task = await taskService.getTask(req.params.id);
      if (!task) {
        // Return 404 if task not found
        return res.status(404).json({ message: 'Task not found' });
      }
      // Return the task as JSON
      return res.json(task);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  });

  // -----------------------------
  // Update a task by ID
  // -----------------------------
  router.put('/:id', async (req, res) => {
    try {
      // Update the task with given ID using request body data
      const updated = await taskService.updateTask(req.params.id, req.body);
      if (!updated) {
        // Return 404 if task not found
        return res.status(404).json({ message: 'Task not found' });
      }
      // Return updated task as JSON
      return res.json(updated);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  });

  // -----------------------------
  // Delete a task by ID
  // -----------------------------
  router.delete('/:id', async (req, res) => {
    try {
      // Delete the task with given ID
      const deleted = await taskService.deleteTask(req.params.id);
      if (!deleted) {
        // Return 404 if task not found
        return res.status(404).json({ message: 'Task not found' });
      }
      // Return confirmation message
      return res.json({ message: 'Task deleted' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  });

  // Return the configured router for use in main app
  return router;
}
