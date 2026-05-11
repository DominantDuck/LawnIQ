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

**Two valid setups:**

1. **Framework: Next.js** — set **Root Directory** to `frontend`. You do not need root `vercel.json` for that (you can delete `experimentalServices` if you switch framework).
2. **Framework: Services** — keep the repo root as the project root. Root `vercel.json` must declare **`experimentalServices`** with at least one service; this repo includes the **`frontend`** Next.js app at `/` (see `vercel.json`).

A root `package.json` also supports **install + build from the repository root** when not using the Services detector for installs.

1. Import the GitHub repo → either **Root Directory:** `frontend` (Next.js framework), or **Services** + root `vercel.json` as committed.
2. **Environment variables:** `GOOGLE_MAPS_API_KEY` (required). Optionally `POSTGRES_URL`, `STATS_API_SECRET` (for `GET /api/stats`).
3. **Neon** (or another Postgres): run `frontend/db/init.sql` once in the SQL editor.
4. **Analytics** → enable **Web Analytics** for visitor metrics.
5. Address searches are stored when `POSTGRES_URL` is set. Example:  
   `curl -H "x-stats-secret: YOUR_SECRET" https://your-app.vercel.app/api/stats`

The Express app in `backend/` is for **local** use or other hosts only, not part of the default Vercel deploy (Next.js serves `/api`). To run Express on Vercel as a separate service in the same repo, see [Vercel Services](https://vercel.com/docs/services).
