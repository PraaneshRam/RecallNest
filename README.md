# RecallNest

RecallNest is a private task manager and learning-recall workspace. Keep everyday tasks organized, group study concepts into projects, and revisit them with scheduled AI-powered recall.

## Current milestone

Milestone 19: RecallNest includes project-based Learning Recall with search, filters, calendar reminders, AI quizzes, progress analytics, and spaced review.

## Run locally

1. Install dependencies:

	```bash
	npm install
	```

2. Copy `.env.example` to `.env` and make sure MongoDB is running.

The default local MongoDB configuration is:

```env
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=task_manager
PORT=5000
JWT_SECRET=replace_with_a_long_random_secret
```

3. Start the frontend and backend:

	```bash
	npm run dev
	```

4. Open the Vite URL and create an account. Passwords must contain at least 8 characters.

The frontend runs on the Vite URL shown in the terminal. The backend runs on `http://localhost:5000` and exposes `GET /api/health` and the task API:

Authentication endpoints:

- `POST /api/auth/register` with `{ "name": "Ada", "email": "ada@example.com", "password": "at-least-8-chars" }`
- `POST /api/auth/login` with `{ "email": "ada@example.com", "password": "at-least-8-chars" }`
- `GET /api/auth/me` with a `Bearer` token

Task and Learning Recall endpoints require the JWT returned by register or login. Tasks, learning entries, and review attempts are filtered by the authenticated user.

- `GET /api/tasks`
- `GET /api/tasks/:id`
- `POST /api/tasks` with `{ "title": "Learn MERN" }`
- `PUT /api/tasks/:id` with `{ "title": "Learn React" }` or `{ "completed": true }`
- `DELETE /api/tasks/:id`

Learning Recall endpoints:

- `GET /api/learning`
- `POST /api/learning` with `{ "topic": "React hooks", "notes": "...", "reminderDate": "2026-10-01" }`
- `DELETE /api/learning/:id`
- `POST /api/learning/:id/questions` for a due entry
- `GET /api/learning/:id/reviews` for recent scores
- `POST /api/learning/:id/reviews` with `{ "score": 4, "total": 5 }`; response includes the next scheduled entry

Study project endpoints:

- `GET /api/projects`
- `POST /api/projects` with `{ "name": "JavaScript Basics" }`
- `DELETE /api/projects/:id`; concepts move to an uncategorized state and remain safe

The UI keeps task state in React and updates the visible list after successful API mutations. Authentication and other roadmap features are intentionally not included.

## Architecture

```text
React components -> taskService -> Express routes -> controllers -> Mongoose Task model -> MongoDB
```

The frontend communicates with the backend over HTTP. It never connects to MongoDB directly. Passwords are hashed with bcrypt and never returned by the API.

Authentication uses hashed passwords and JWT sessions. The local `.env` includes a development-only `JWT_SECRET`; replace it with a long random value before deployment. Never commit `.env`.

## Useful commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Vite and the backend together |
| `npm run server` | Start only the backend with Nodemon |
| `npm run check` | Run lint and production build |
| `npm run preview` | Preview the production frontend build |

## Production checklist

1. Use MongoDB Atlas and set `MONGODB_URI` in the backend environment.
2. Set a long random `JWT_SECRET`; never use the local development value.
3. Add `AI_API_KEY`, `AI_API_URL`, and `AI_MODEL` only to the backend environment.
4. Deploy the backend and frontend separately, then update the Vite API proxy or production API base URL for the hosting domains.
5. Enable HTTPS and configure CORS to allow only the deployed frontend origin.
6. Run `npm run check` before each deployment.

## Verified checks

- MongoDB connection and `GET /api/health`
- Create task with default pending state
- Reject blank titles with `400`
- Reject malformed IDs with `400`
- List tasks newest first
- Update title and completion state
- Delete task and return `404` when deleting it again
- Frontend production build and lint

The project includes authentication, private user data, AI recall integration, spaced review scheduling, study projects, search, sorting, and responsive UI. Automated browser tests and hosted deployment remain release tasks because they require a browser test runner and hosting credentials.

## Learning Recall roadmap

The Learning Recall page lets a user create study projects such as JavaScript Basics, then add many concepts and reminder dates inside the selected project. Older concepts are automatically moved into an `Unsorted` project. Concepts can be searched by topic or notes and filtered by all, ready, upcoming, or reviewed. A current-month calendar highlights reminder counts and overdue dates. Due entries request multiple-choice active-recall questions, evaluate selected answers, reveal explanations, rate confidence, and persist the resulting score. The dashboard shows total concepts, reviews ready today, reviewed topics, average score, weekly review count, streak, weakest topic, strongest topic, and a recent score trend. Spaced review scheduling uses 14 days for a perfect score, 7 days for a score of at least 60%, and 1 day when more review is needed. Configure `AI_API_KEY`, `AI_API_URL`, and `AI_MODEL` in the backend `.env`; these values are never sent to the browser. Without `AI_API_KEY`, the endpoint intentionally returns `503` with setup guidance.

## Future enhancements

Filtering and search, due dates, priorities, authentication, per-user tasks, pagination, deployment, and automated browser tests can be added as separate milestones.

