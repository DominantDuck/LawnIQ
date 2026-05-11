import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { generateToken } from '../../../../middleware/auth.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/register
 * Create new user account with email and password
 */
export async function POST(request) {
  try {
    const { sql } = await import('@vercel/postgres');
    const body = await request.json();

    // Validate input
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
    const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';

    // Required field validation
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    if (!firstName) {
      return NextResponse.json({ error: 'First name is required' }, { status: 400 });
    }

    if (!lastName) {
      return NextResponse.json({ error: 'Last name is required' }, { status: 400 });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Password strength validation
    if (password.length < 8) {
      return NextResponse.json({
        error: 'Password must be at least 8 characters long'
      }, { status: 400 });
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

    // Check if user already exists
    const existingUserResult = await sql`
      SELECT id FROM users WHERE email = ${email} LIMIT 1
    `;

    if (existingUserResult.rows.length > 0) {
      return NextResponse.json({
        error: 'Account already exists',
        message: 'An account with this email address already exists'
      }, { status: 409 });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create new user
    const userResult = await sql`
      INSERT INTO users (email, password_hash, first_name, last_name)
      VALUES (${email}, ${passwordHash}, ${firstName}, ${lastName})
      RETURNING id, email, first_name, last_name, created_at
    `;

    const newUser = userResult.rows[0];

    // Generate JWT token for immediate login
    const token = generateToken({
      id: newUser.id,
      email: newUser.email,
      first_name: newUser.first_name,
      last_name: newUser.last_name
    });

    // Create response with user data
    const userData = {
      id: newUser.id,
      email: newUser.email,
      first_name: newUser.first_name,
      last_name: newUser.last_name,
      created_at: newUser.created_at
    };

    // Set HTTP-only cookie with JWT token
    const response = NextResponse.json({
      success: true,
      user: userData,
      message: 'Account created successfully'
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
    console.error('register-error:', error?.message || error, error?.code);

    // Handle database constraint violations
    if (error.code === '23505') { // PostgreSQL unique constraint violation
      return NextResponse.json({
        error: 'Account already exists',
        message: 'An account with this email address already exists'
      }, { status: 409 });
    }

    // Undefined table / relation (schema not applied)
    if (error.code === '42P01') {
      return NextResponse.json({
        error: 'Database schema missing',
        message: 'Run the CRM schema on this database (see frontend/db/crm-schema.sql or npm run db:crm).'
      }, { status: 500 });
    }

    return NextResponse.json({
      error: 'Registration failed',
      message:
        process.env.NODE_ENV === 'development'
          ? (error?.message || 'An internal server error occurred')
          : 'An internal server error occurred'
    }, { status: 500 });
  }
}