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

## Deploy on Vercel

1. Import the repo; set **Root Directory** to `frontend`.
2. **Environment variables:** `GOOGLE_MAPS_API_KEY` (required). Optionally `POSTGRES_URL`, `STATS_API_SECRET` (for `GET /api/stats`).
3. Add **Vercel Postgres** (or Neon) and run `frontend/db/init.sql` in the SQL editor.
4. In the Vercel project → **Analytics**, enable **Web Analytics** for visitors and page views.
5. Address searches are stored in `address_searches` when `POSTGRES_URL` is set. Fetch summaries with:

   `curl -H "x-stats-secret: YOUR_SECRET" https://your-app.vercel.app/api/stats`
