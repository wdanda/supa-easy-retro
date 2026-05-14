# Scrum Retro Project Instructions

## Tech Stack
- **Backend:** Node.js, Express, Socket.io
- **Frontend:** Angular (v21), NgRx for state management
- **Database:** Supabase (PostgreSQL)
- **Deployment:** Render (configured via `render.yaml`)

## Architecture & Conventions

### Backend (`server.js`)
- Real-time communication via Socket.io for board state updates.
- REST endpoints for user and board management.
- Uses Supabase client with service role key (RLS disabled).
- Boards and cards are stored in a `jsonb` column `columns`.

### Frontend (`retro-frontend/`)
- **State Management:** NgRx Store is used with optimistic updates for a responsive feel.
- **Component Pattern:** Logic is separated into components (Dashboard, BoardPage, Column, Card).
- **Socket Integration:** `SocketService` handles the real-time sync between the store and the backend.

### Database (`supabase-schema.sql`)
- `users`: Basic user info.
- `boards`: Contains board metadata and the `jsonb` board state.

## Workflows
- **Running Locally:**
  - Backend: `npm start` (requires `.env` with Supabase credentials).
  - Frontend: `cd retro-frontend && npm start`.
- **Building for Production:**
  - `npm run build` in `retro-frontend` moves files to `dist/`, which the backend serves as static assets.
