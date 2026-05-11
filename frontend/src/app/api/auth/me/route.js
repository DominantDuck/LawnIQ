import { authMiddleware } from '../../../../middleware/auth.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/me
 * Get current authenticated user information
 */
export const GET = authMiddleware(async (request) => {
  try {
    const { sql } = await import('@vercel/postgres');

    // User information is already validated and added to request by authMiddleware
    const userId = request.user.id;

    // Check database connection
    if (!process.env.POSTGRES_URL) {
      return Response.json({
        error: 'Database not configured',
        message: 'POSTGRES_URL environment variable is required'
      }, { status: 500 });
    }

    // Get fresh user data from database to ensure it's up to date
    const userResult = await sql`
      SELECT id, email, first_name, last_name, created_at, updated_at
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    `;

    if (userResult.rows.length === 0) {
      // This shouldn't happen if JWT is valid, but handle gracefully
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const user = userResult.rows[0];

    // Return user data without sensitive information
    return Response.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        created_at: user.created_at,
        updated_at: user.updated_at
      }
    });

  } catch (error) {
    console.error('auth-me-error:', error);
    return Response.json({
      error: 'Failed to get user information',
      message: 'An internal server error occurred'
    }, { status: 500 });
  }
});