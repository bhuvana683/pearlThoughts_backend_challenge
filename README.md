Backend Developer Interview Challenge – Task Sync API

Overview

This project implements a backend API for a personal task management app with offline-first support. Users can create, update, and delete tasks while offline, and all changes sync automatically when connectivity is restored.



Approach to the Sync Problem

Offline-first architecture: All operations are stored locally in a sync queue.

Batch processing: Pending operations are sent to the server in batches.

Conflict resolution: Uses last-write-wins strategy based on updated_at.

Sync status tracking: Each task has a sync_status (pending, synced, error) and last_synced_at.

Retries: Failed syncs are retried up to 3 times to ensure data consistency.




Assumptions

Task title is mandatory; description is optional.

Soft deletes implemented via is_deleted; tasks are never permanently removed.

Client generates UUIDs for new tasks.

Offline changes may be batched and retried automatically.

Batch size defaults to all pending tasks; no limit specified.

Project Structure
backend-interview-challenge/
├── src/
│   ├── db/           # Database setup
│   ├── services/     # Business logic (taskService.ts, syncService.ts)
│   ├── routes/       # API endpoints (tasks.ts, sync.ts)
│   ├── middleware/   # Express middleware
│   ├── types/        # TypeScript interfaces
│   └── server.ts     # Express server setup
├── tests/            # Unit and integration tests
├── docs/             # Documentation
└── package.json      # Dependencies and scripts

How to Run

Clone  private fork:

git clone <YOUR_PRIVATE_FORK_URL>
cd backend-interview-challenge


Install dependencies:
npm install


Configure environment variables:
cp .env.example .env


Start the development server:
npm run dev

How to Test

Run all tests:

npm test


Optional checks:

npm run lint       # Ensure no linting errors
npm run typecheck  # Ensure no TypeScript errors



1 POST a new task:

$newTask = @{ title="dance"; description="fun" } | ConvertTo-Json
Invoke-RestMethod -Method POST -Uri "http://localhost:3000/api/tasks" -Body $newTask -ContentType "application/json"

2 GET

Invoke-RestMethod -Method GET -Uri "http://localhost:3000/api/tasks"


3 GET single task

Invoke-RestMethod -Method GET -Uri "http://localhost:3000/api/tasks/587a6c58-cd16-487d-9573-4cb4fd1daa4f"


4  PUT /tasks/:id – update a task

$updateTask = @{ title="Dance Updated"; description="Competition updated" } | ConvertTo-Json
Invoke-RestMethod -Method PUT -Uri "http://localhost:3000/api/tasks/587a6c58-cd16-487d-9573-4cb4fd1daa4f" -Body $updateTask -ContentType "application/json"

5 DELETE/tasks/:id – soft delete a task

Invoke-RestMethod -Method DELETE -Uri "http://localhost:3000/api/tasks/2ba48375-0870-486b-9b43-d3cc5b933477"






