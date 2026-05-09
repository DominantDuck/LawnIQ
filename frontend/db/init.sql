-- Run once in Vercel Postgres → Storage → your DB → Query, or via `psql`.
CREATE TABLE IF NOT EXISTS address_searches (
  id SERIAL PRIMARY KEY,
  formatted_address TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_address_searches_created_at ON address_searches (created_at DESC);
