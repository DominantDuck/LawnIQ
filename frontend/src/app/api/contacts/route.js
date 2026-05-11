import { NextResponse } from 'next/server';
import { authMiddleware } from '../../../middleware/auth.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/contacts
 * List all contacts for the authenticated user
 */
const GET = authMiddleware(async (request) => {
  try {
    const { sql } = await import('@vercel/postgres');
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    const limit = parseInt(url.searchParams.get('limit')) || 50;
    const offset = parseInt(url.searchParams.get('offset')) || 0;

    // Base query to get contacts for the authenticated user
    let contactsQuery;
    let countQuery;

    if (search.trim()) {
      // Search in first_name, last_name, email, and phone
      const searchPattern = `%${search.trim()}%`;
      contactsQuery = sql`
        SELECT id, first_name, last_name, email, phone, address, notes, created_at, updated_at
        FROM contacts
        WHERE user_id = ${request.user.id}
        AND (
          first_name ILIKE ${searchPattern}
          OR last_name ILIKE ${searchPattern}
          OR email ILIKE ${searchPattern}
          OR phone ILIKE ${searchPattern}
          OR CONCAT(first_name, ' ', last_name) ILIKE ${searchPattern}
        )
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      countQuery = sql`
        SELECT COUNT(*) as total
        FROM contacts
        WHERE user_id = ${request.user.id}
        AND (
          first_name ILIKE ${searchPattern}
          OR last_name ILIKE ${searchPattern}
          OR email ILIKE ${searchPattern}
          OR phone ILIKE ${searchPattern}
          OR CONCAT(first_name, ' ', last_name) ILIKE ${searchPattern}
        )
      `;
    } else {
      contactsQuery = sql`
        SELECT id, first_name, last_name, email, phone, address, notes, created_at, updated_at
        FROM contacts
        WHERE user_id = ${request.user.id}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      countQuery = sql`
        SELECT COUNT(*) as total
        FROM contacts
        WHERE user_id = ${request.user.id}
      `;
    }

    const [contactsResult, countResult] = await Promise.all([contactsQuery, countQuery]);

    return NextResponse.json({
      success: true,
      contacts: contactsResult.rows,
      total: parseInt(countResult.rows[0].total),
      limit,
      offset,
      search: search.trim()
    });

  } catch (error) {
    console.error('contacts-get-error:', error);
    return NextResponse.json({
      error: 'Failed to fetch contacts',
      message: 'An internal server error occurred'
    }, { status: 500 });
  }
});

/**
 * POST /api/contacts
 * Create a new contact for the authenticated user
 */
const POST = authMiddleware(async (request) => {
  try {
    const { sql } = await import('@vercel/postgres');
    const body = await request.json();

    // Validate required fields
    const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
    const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const address = typeof body.address === 'string' ? body.address.trim() : '';
    const notes = typeof body.notes === 'string' ? body.notes.trim() : '';

    // Required field validation
    if (!firstName) {
      return NextResponse.json({ error: 'First name is required' }, { status: 400 });
    }

    if (!lastName) {
      return NextResponse.json({ error: 'Last name is required' }, { status: 400 });
    }

    // Email validation if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
      }
    }

    // Check for duplicate email within user's contacts (if email provided)
    if (email) {
      const existingContactResult = await sql`
        SELECT id FROM contacts
        WHERE user_id = ${request.user.id} AND email = ${email}
        LIMIT 1
      `;

      if (existingContactResult.rows.length > 0) {
        return NextResponse.json({
          error: 'Contact with this email already exists',
          message: 'A contact with this email address already exists in your contacts'
        }, { status: 409 });
      }
    }

    // Create new contact
    const contactResult = await sql`
      INSERT INTO contacts (user_id, first_name, last_name, email, phone, address, notes)
      VALUES (${request.user.id}, ${firstName}, ${lastName}, ${email || null}, ${phone || null}, ${address || null}, ${notes || null})
      RETURNING id, first_name, last_name, email, phone, address, notes, created_at, updated_at
    `;

    const newContact = contactResult.rows[0];

    return NextResponse.json({
      success: true,
      contact: newContact,
      message: 'Contact created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('contacts-post-error:', error);

    // Handle database constraint violations
    if (error.code === '23505') { // PostgreSQL unique constraint violation
      return NextResponse.json({
        error: 'Contact already exists',
        message: 'A contact with this information already exists'
      }, { status: 409 });
    }

    return NextResponse.json({
      error: 'Failed to create contact',
      message: 'An internal server error occurred'
    }, { status: 500 });
  }
});

// Export the authenticated route handlers
export { GET, POST };