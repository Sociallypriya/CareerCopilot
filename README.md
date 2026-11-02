# CareerCopilot

CareerCopilot is a job-search tracker for organizing applications, recruiter updates, interviews, and follow-ups. It includes a public landing page, account registration and sign-in, and a private application dashboard.

## Features

- Track applications, roles, sources, stages, dates, notes, and resume versions
- Search and filter applications; review due follow-ups
- Paste recruiter emails for Gemini-powered summaries and stage/date extraction
- Configure a profile, workspace name, and time zone
- Store salary currency per application, with the workspace currency as the default for new applications
- Keep application and workspace data scoped to the signed-in account

## Stack

- Frontend: React 19 and Vite
- Backend: Node.js, Express, and Mongoose
- Database: MongoDB
- Authentication: scrypt password hashes and signed bearer tokens
- Email parsing: Google Gemini API

## Local development

Requirements: Node.js 20.19+ (or 22.12+) and a MongoDB database available locally or through MongoDB Atlas.

### 1. Configure the backend

Create `backend/.env` from `backend/.env.example` if you do not already have one. Set the database URI and a random `JWT_SECRET` that is at least 32 characters long. Add a Gemini API key to enable recruiter email parsing.

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/careercopilot
CLIENT_URL=http://localhost:5173
GEMINI_API_KEY=your-gemini-api-key
JWT_SECRET=replace-with-a-random-secret-at-least-32-characters-long
```

Never commit `backend/.env` or production secrets.

Start the API:

```powershell
cd backend
npm install
npm run dev
```

The API health endpoint is `http://localhost:5000/api/health`.

### 2. Start the frontend

In another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api` requests to `http://localhost:5000` by default. Set `API_PROXY_TARGET` in the environment running Vite if your backend uses another address.

The first account registered adopts existing application and workspace records that have no account owner.

## Production build

```powershell
cd frontend
npm run build
```

Vite writes the static site to `frontend/dist`.

## Deploy on Render

Deploy the frontend and backend as separate services from the same Git repository.

### Backend Web Service

- Root directory: `backend`
- Build command: `npm ci`
- Start command: `npm start`
- Health check path: `/api/health`
- Environment variables: `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL`, and `GEMINI_API_KEY`

Use MongoDB Atlas or another reachable MongoDB deployment, and allow network access from Render.

### Frontend Static Site

- Root directory: `frontend`
- Build command: `npm ci && npm run build`
- Publish directory: `dist`
- Build environment variable: `VITE_API_BASE_URL=https://<your-backend>.onrender.com`

Add a rewrite rule from `/*` to `/index.html` so direct visits and refreshes on `/signup`, `/login`, and `/app` reach the React app. Set the backend's `CLIENT_URL` to the exact deployed frontend origin, then redeploy the backend.

## Repository layout

```text
backend/   Express API, MongoDB models, auth, and Gemini email parsing
frontend/  React/Vite landing page, auth screens, and application dashboard
```
