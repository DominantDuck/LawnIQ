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

**Root Directory = `frontend` (recommended)**

- **Framework: Next.js** — simplest: no `experimentalServices` needed. You can delete `frontend/vercel.json` if you switch off Services.
- **Framework: Services** — this repo ships **`frontend/vercel.json`** declaring one Next.js service with `"entrypoint": "."` (the app **is** the Root Directory). Do **not** use a repo-root `vercel.json` with `"entrypoint": "frontend"` in this layout; that path is wrong once the project root is already `frontend/`.

**Include files outside the root directory in the Build Step** — leave **off** unless a build fails because something outside `frontend/` is required (this app does not import parent folders).

**Root Directory empty (repo root) + Services** — use a **repository root** `vercel.json` with `"entrypoint": "frontend"` (restore from git history or duplicate the `experimentalServices` block with paths relative to repo root). A root `package.json` can still help install/build from the monorepo root.

1. Import the GitHub repo → **Root Directory:** `frontend` (typical). Env vars and build read from `frontend/`.
2. **Environment variables:** `GOOGLE_MAPS_API_KEY` (required). Optionally `POSTGRES_URL`, `STATS_API_SECRET` (for `GET /api/stats`).
3. **Neon** (or another Postgres): run `frontend/db/init.sql` once in the SQL editor.
4. **Analytics** → enable **Web Analytics** for visitor metrics.
5. Address searches are stored when `POSTGRES_URL` is set. Example:  
   `curl -H "x-stats-secret: YOUR_SECRET" https://your-app.vercel.app/api/stats`

The Express app in `backend/` is for **local** use or other hosts only, not part of the default Vercel deploy (Next.js serves `/api`). To run Express on Vercel as a separate service in the same repo, see [Vercel Services](https://vercel.com/docs/services).
