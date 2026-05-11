/**
 * Apply frontend/db/crm-schema.sql using POSTGRES_URL (no psql required).
 * Loads repo root .env when present.
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function loadRootEnv() {
  const root = path.join(__dirname, '..', '..');
  const envPath = path.join(root, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

async function main() {
  loadRootEnv();
  const url = process.env.POSTGRES_URL;
  if (!url) {
    console.error('POSTGRES_URL is not set. Add it to the repo root .env file.');
    process.exit(1);
  }

  const sqlPath = path.join(__dirname, '..', 'db', 'crm-schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  const local = /localhost|127\.0\.0\.1/.test(url);
  const client = new Client({
    connectionString: url,
    ...(!local ? { ssl: { rejectUnauthorized: false } } : {})
  });
  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }

  console.log('Applied', sqlPath);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
