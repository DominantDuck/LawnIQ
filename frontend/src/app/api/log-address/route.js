export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  if (!process.env.POSTGRES_URL) {
    return Response.json({ ok: true, persisted: false, reason: 'no_database' });
  }

  try {
    const { sql } = await import('@vercel/postgres');
    const body = await request.json();
    const formattedAddress =
      typeof body.formattedAddress === 'string' ? body.formattedAddress.trim() : '';
    if (!formattedAddress) {
      return Response.json({ error: 'formattedAddress required' }, { status: 400 });
    }

    const lat = Number.isFinite(body.lat) ? body.lat : null;
    const lng = Number.isFinite(body.lng) ? body.lng : null;

    await sql`
      INSERT INTO address_searches (formatted_address, lat, lng)
      VALUES (${formattedAddress}, ${lat}, ${lng})
    `;

    return Response.json({ ok: true, persisted: true });
  } catch (err) {
    console.error('log-address:', err);
    return Response.json({ ok: false, error: 'persist_failed' }, { status: 500 });
  }
}
