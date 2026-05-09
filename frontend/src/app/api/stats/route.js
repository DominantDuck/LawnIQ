export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Protected summary for your own use (curl / Postman / internal tool).
 * Header: x-stats-secret: <STATS_API_SECRET>
 */
export async function GET(request) {
  const secret = request.headers.get('x-stats-secret');
  if (!process.env.STATS_API_SECRET || secret !== process.env.STATS_API_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.POSTGRES_URL) {
    return Response.json({
      addressSearches: null,
      message: 'POSTGRES_URL not configured'
    });
  }

  try {
    const { sql } = await import('@vercel/postgres');
    const total = await sql`
      SELECT COUNT(*)::int AS c FROM address_searches
    `;
    const last24h = await sql`
      SELECT COUNT(*)::int AS c FROM address_searches
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `;
    const recent = await sql`
      SELECT id, formatted_address, lat, lng, created_at
      FROM address_searches
      ORDER BY created_at DESC
      LIMIT 50
    `;

    return Response.json({
      addressSearches: {
        total: total.rows[0]?.c ?? 0,
        last24Hours: last24h.rows[0]?.c ?? 0,
        recent: recent.rows
      },
      note: 'Visitor/page-view counts: enable Vercel Web Analytics in the project dashboard.'
    });
  } catch (err) {
    console.error('stats:', err);
    return Response.json({ error: 'query_failed' }, { status: 500 });
  }
}
