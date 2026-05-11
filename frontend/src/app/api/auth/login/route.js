import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { generateToken } from '../../../../middleware/auth.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/login
 * Authenticate user with email and password
 */
export async function POST(request) {
  try {
    const { sql } = await import('@vercel/postgres');
    const body = await request.json();

    // Validate input
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Check database connection
    if (!process.env.POSTGRES_URL) {
      return NextResponse.json({
        error: 'Database not configured',
        message: 'POSTGRES_URL environment variable is required'
      }, { status: 500 });
    }

    if (!process.env.JWT_SECRET) {
      return NextResponse.json({
        error: 'Authentication not configured',
        message: 'JWT_SECRET environment variable is required'
      }, { status: 500 });
    }

    // Find user by email
    const userResult = await sql`
      SELECT id, email, password_hash, first_name, last_name, created_at
      FROM users
      WHERE email = ${email}
      LIMIT 1
    `;

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const user = userResult.rows[0];

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name
    });

    // Create response with user data (excluding password)
    const userData = {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      created_at: user.created_at
    };

    // Set HTTP-only cookie with JWT token
    const response = NextResponse.json({
      success: true,
      user: userData,
      message: 'Login successful'
    });

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('login-error:', error);
    return NextResponse.json({
      error: 'Login failed',
      message: 'An internal server error occurred'
    }, { status: 500 });
  }
}