// middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';

/**
 * Global error handler middleware for Express
 * Catches any unhandled errors in routes and returns 500
 */
export function errorHandler(
  err: any,              // The error thrown in any route
  _req: Request,         // Request object (unused)
  res: Response,         // Response object to send error back
  _next: NextFunction    // Next function (unused)
) {
  // Log the error details in console for debugging
  console.error(err);

  // Send generic internal server error message to client
  res.status(500).json({ message: 'Internal Server Error' });
}
