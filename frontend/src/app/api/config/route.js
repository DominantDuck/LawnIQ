export const dynamic = 'force-dynamic';

export async function GET() {
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || '';

  return Response.json({
    success: true,
    config: {
      googleMapsApiKey,
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development'
    },
    timestamp: new Date().toISOString()
  });
}
