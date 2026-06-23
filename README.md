# 🍽️ Dish Dashboard

A full-stack dish management app — React frontend + Node/Express backend + PostgreSQL + real-time updates via SSE.

---

## Quick Start (3 steps)

### Step 1 — PostgreSQL setup

Make sure PostgreSQL is running, then create the database:

```bash
psql -U postgres
```

```sql
CREATE DATABASE dish_db;
\q
```

---

### Step 2 — Backend

```bash
cd backend

# Copy env and fill in your Postgres password
cp .env.example .env
# Edit .env: set DB_PASSWORD (and DB_USER if not 'postgres')

npm install
npm start
```

✅ Server starts at **http://localhost:4000**  
✅ Table is auto-created and seeded with 12 dishes on first run.

---

### Step 3 — Frontend

```bash
# In a new terminal
cd frontend
npm install
npm start
```

✅ Dashboard opens at **http://localhost:3000**  
(The `"proxy"` in package.json forwards API calls to port 4000 automatically — no CORS issues.)

---

## Project Structure

```
dish-project/
├── backend/
│   ├── server.js          ← Express app — all routes + SSE broadcaster
│   ├── .env.example       ← copy to .env, fill in DB creds
│   └── package.json
│
└── frontend/
    ├── public/
    │   └── index.html
    └── src/
        ├── App.js             ← Root component, all state management
        ├── App.module.css
        ├── index.js
        ├── index.css          ← Design tokens, global styles
        ├── hooks/
        │   └── useSSE.js      ← SSE hook with auto-reconnect
        └── components/
            ├── DishCard.js        ← Dish card + toggle button
            ├── DishCard.module.css
            ├── SSEStatus.js       ← Live / Connecting / Reconnecting pill
            ├── SSEStatus.module.css
            ├── Toast.js           ← Notification toasts
            └── Toast.module.css
```

---

## API Endpoints

| Method | Endpoint              | Description                              |
|--------|-----------------------|------------------------------------------|
| GET    | `/health`             | Health check                             |
| GET    | `/dishes`             | Fetch all dishes (sorted by name)        |
| GET    | `/dishes/:id`         | Fetch single dish                        |
| PATCH  | `/dishes/:id/toggle`  | Toggle `isPublished` → broadcasts SSE    |
| GET    | `/events`             | SSE stream (connect from browser)        |

---

## Database Schema

```sql
CREATE TABLE dishes (
  "dishId"      VARCHAR(50)  PRIMARY KEY,
  "dishName"    VARCHAR(255) NOT NULL,
  "imageUrl"    TEXT         NOT NULL,
  "isPublished" BOOLEAN      NOT NULL DEFAULT false,
  "updatedAt"   TIMESTAMPTZ  DEFAULT NOW()
);
```

---

## Real-Time Updates (SSE — Bonus Feature)

When **any** client toggles a dish — whether from the dashboard UI or a direct API call — the backend immediately pushes a `dish_updated` event to every connected browser tab.

### Demo from terminal

```bash
# Terminal 1 — watch the SSE stream raw
curl -N http://localhost:4000/events

# Terminal 2 — toggle a dish directly (simulates a backend change)
curl -X PATCH http://localhost:4000/dishes/dish_001/toggle
```

In the dashboard, the card instantly updates and flashes orange — with a ⚡ toast saying **"backend update"**.

### How it works

```
Browser  ──GET /events──►  Express (keeps connection open)
                              │
Any PATCH /toggle             │
  → DB updated                │
  → broadcast('dish_updated') ─► all open EventSource connections
                                      │
                                 React state updates instantly
```

The `useSSE` hook auto-reconnects with exponential back-off if the connection drops.

---

## .env Reference

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dish_db
DB_USER=postgres
DB_PASSWORD=your_password_here
PORT=4000
```

---

## Tech Stack

| Layer     | Technology              |
|-----------|-------------------------|
| Frontend  | React 18, CSS Modules   |
| Backend   | Node.js, Express 4      |
| Database  | PostgreSQL (via `pg`)   |
| Real-time | Server-Sent Events      |
