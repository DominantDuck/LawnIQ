# SwiftQuote.

Manual area measurement on satellite maps. **Next.js** frontend (`frontend/`) serves `/api` by default (Maps config, address logging, stats). Optional **Express** backend (`backend/`) is only needed if you set `USE_EXPRESS_BACKEND=true`.

## Run locally (Next only — recommended)

```bash
cd frontend && cp .env.example .env.local
```

Set `GOOGLE_MAPS_API_KEY` in `frontend/.env.local`. Optionally set `POSTGRES_URL` for address search logging (see `frontend/db/init.sql`).

```bash
cd frontend && npm install && npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Run locally (Express proxy — legacy)

```bash
cd backend && npm run dev:node
```

```bash
cd frontend && USE_EXPRESS_BACKEND=true npm run dev
```

Maps key can stay in `backend/.env` when using the proxy; Next route handlers are bypassed for `/api/*`.

## Deploy on Vercel (Next.js only)

This repo is set up for a **single Vercel project** with **Root Directory = `frontend`**. No root `vercel.json` is required.

1. Import the GitHub repo → **Root Directory:** `frontend`.
2. **Environment variables:** `GOOGLE_MAPS_API_KEY` (required). Optionally `POSTGRES_URL`, `STATS_API_SECRET` (for `GET /api/stats`).
3. **Neon** (or another Postgres): run `frontend/db/init.sql` once in the SQL editor.
4. **Analytics** → enable **Web Analytics** for visitor metrics.
5. Address searches are stored when `POSTGRES_URL` is set. Example:  
   `curl -H "x-stats-secret: YOUR_SECRET" https://your-app.vercel.app/api/stats`

The Express app in `backend/` is for **local** use or other hosts only, not part of this Vercel deploy. To also run Express on Vercel in the same repo, you’d use [Vercel Services](https://vercel.com/docs/services) (`experimentalServices` in a root `vercel.json`) and set `EXPRESS_ROUTE_PREFIX` to match your backend `routePrefix`.
