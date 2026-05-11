import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

/**
 * JWT Authentication Middleware for protecting API routes
 *
 * Usage:
 * import { authMiddleware } from '../../middleware/auth';
 * export const GET = authMiddleware(async (request) => {
 *   const userId = request.user.id;
 *   // Your protected route logic here
 * });
 */
export function authMiddleware(handler) {
  return async (request, ...args) => {
    try {
      // Get JWT token from cookies
      const token = request.cookies.get('auth-token')?.value;

      if (!token) {
        console.log('Auth middleware: No token provided');
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }

      // Verify JWT secret is configured
      if (!process.env.JWT_SECRET) {
        console.error('Auth middleware: JWT_SECRET not configured');
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
      }

      // Verify and decode the JWT token
      const payload = jwt.verify(token, process.env.JWT_SECRET);

      // Add user info to request object for use in protected routes
      request.user = {
        id: payload.id,
        email: payload.email,
        first_name: payload.first_name,
        last_name: payload.last_name
      };

      // Call the original handler with authenticated context
      return handler(request, ...args);

    } catch (error) {
      console.error('Auth middleware error:', error.message);

      // Handle specific JWT errors
      if (error.name === 'TokenExpiredError') {
        return NextResponse.json({ error: 'Token expired' }, { status: 401 });
      } else if (error.name === 'JsonWebTokenError') {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      } else {
        return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
      }
    }
  };
}

/**
 * Helper function to generate JWT tokens for login
 */
export function generateToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '7d', // Token expires in 7 days
      issuer: 'swiftquote-crm',
      audience: 'swiftquote-users'
    }
  );
}

/**
 * Helper function to verify if a token is valid (without throwing)
 */
export function verifyToken(token) {
  try {
    if (!process.env.JWT_SECRET || !token) {
      return null;
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return {
      id: payload.id,
      email: payload.email,
      first_name: payload.first_name,
      last_name: payload.last_name
    };
  } catch (error) {
    console.log('Token verification failed:', error.message);
    return null;
  }
}