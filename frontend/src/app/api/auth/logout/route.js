import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/logout
 * Clear authentication cookie and log out user
 */
export async function POST(request) {
  try {
    // Create response with NextResponse to access cookies API
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });

    // Clear the auth-token cookie by setting it to expire in the past
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: new Date(0), // Expire immediately
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('logout-error:', error);
    return NextResponse.json({
      error: 'Logout failed',
      message: 'An error occurred during logout'
    }, { status: 500 });
  }
}