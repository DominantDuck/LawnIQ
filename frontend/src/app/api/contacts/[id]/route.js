import { NextResponse } from 'next/server';
import { authMiddleware } from '../../../../middleware/auth.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/contacts/[id]
 * Get a specific contact by ID for the authenticated user
 */
const GET = authMiddleware(async (request, { params }) => {
  try {
    const { sql } = await import('@vercel/postgres');
    const { id } = await params;

    // Validate contact ID
    const contactId = parseInt(id);
    if (!contactId || contactId < 1) {
      return NextResponse.json({ error: 'Invalid contact ID' }, { status: 400 });
    }

    // Get contact with ownership check
    const contactResult = await sql`
      SELECT id, first_name, last_name, email, phone, address, notes, created_at, updated_at
      FROM contacts
      WHERE id = ${contactId} AND user_id = ${request.user.id}
      LIMIT 1
    `;

    if (contactResult.rows.length === 0) {
      return NextResponse.json({
        error: 'Contact not found',
        message: 'Contact does not exist or you do not have permission to access it'
      }, { status: 404 });
    }

    const contact = contactResult.rows[0];

    return NextResponse.json({
      success: true,
      contact
    });

  } catch (error) {
    console.error('contacts-get-by-id-error:', error);
    return NextResponse.json({
      error: 'Failed to fetch contact',
      message: 'An internal server error occurred'
    }, { status: 500 });
  }
});

/**
 * PUT /api/contacts/[id]
 * Update a specific contact by ID for the authenticated user
 */
const PUT = authMiddleware(async (request, { params }) => {
  try {
    const { sql } = await import('@vercel/postgres');
    const { id } = await params;
    const body = await request.json();

    // Validate contact ID
    const contactId = parseInt(id);
    if (!contactId || contactId < 1) {
      return NextResponse.json({ error: 'Invalid contact ID' }, { status: 400 });
    }

    // Validate input
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

    // Check if contact exists and user owns it
    const existingContactResult = await sql`
      SELECT id FROM contacts
      WHERE id = ${contactId} AND user_id = ${request.user.id}
      LIMIT 1
    `;

    if (existingContactResult.rows.length === 0) {
      return NextResponse.json({
        error: 'Contact not found',
        message: 'Contact does not exist or you do not have permission to update it'
      }, { status: 404 });
    }

    // Check for duplicate email within user's contacts (excluding current contact)
    if (email) {
      const duplicateEmailResult = await sql`
        SELECT id FROM contacts
        WHERE user_id = ${request.user.id} AND email = ${email} AND id != ${contactId}
        LIMIT 1
      `;

      if (duplicateEmailResult.rows.length > 0) {
        return NextResponse.json({
          error: 'Email already in use',
          message: 'Another contact already uses this email address'
        }, { status: 409 });
      }
    }

    // Update contact
    const updateResult = await sql`
      UPDATE contacts
      SET
        first_name = ${firstName},
        last_name = ${lastName},
        email = ${email || null},
        phone = ${phone || null},
        address = ${address || null},
        notes = ${notes || null},
        updated_at = NOW()
      WHERE id = ${contactId} AND user_id = ${request.user.id}
      RETURNING id, first_name, last_name, email, phone, address, notes, created_at, updated_at
    `;

    const updatedContact = updateResult.rows[0];

    return NextResponse.json({
      success: true,
      contact: updatedContact,
      message: 'Contact updated successfully'
    });

  } catch (error) {
    console.error('contacts-put-error:', error);

    // Handle database constraint violations
    if (error.code === '23505') { // PostgreSQL unique constraint violation
      return NextResponse.json({
        error: 'Email already in use',
        message: 'Another contact already uses this email address'
      }, { status: 409 });
    }

    return NextResponse.json({
      error: 'Failed to update contact',
      message: 'An internal server error occurred'
    }, { status: 500 });
  }
});

/**
 * DELETE /api/contacts/[id]
 * Delete a specific contact by ID for the authenticated user
 */
const DELETE = authMiddleware(async (request, { params }) => {
  try {
    const { sql } = await import('@vercel/postgres');
    const { id } = await params;

    // Validate contact ID
    const contactId = parseInt(id);
    if (!contactId || contactId < 1) {
      return NextResponse.json({ error: 'Invalid contact ID' }, { status: 400 });
    }

    // Check if contact exists and user owns it
    const existingContactResult = await sql`
      SELECT id, first_name, last_name FROM contacts
      WHERE id = ${contactId} AND user_id = ${request.user.id}
      LIMIT 1
    `;

    if (existingContactResult.rows.length === 0) {
      return NextResponse.json({
        error: 'Contact not found',
        message: 'Contact does not exist or you do not have permission to delete it'
      }, { status: 404 });
    }

    const contactToDelete = existingContactResult.rows[0];

    // Delete contact (this will cascade to delete associated properties, leads, etc. due to CASCADE constraints)
    await sql`
      DELETE FROM contacts
      WHERE id = ${contactId} AND user_id = ${request.user.id}
    `;

    return NextResponse.json({
      success: true,
      message: `Contact ${contactToDelete.first_name} ${contactToDelete.last_name} deleted successfully`
    });

  } catch (error) {
    console.error('contacts-delete-error:', error);
    return NextResponse.json({
      error: 'Failed to delete contact',
      message: 'An internal server error occurred'
    }, { status: 500 });
  }
});

// Export the authenticated route handlers
export { GET, PUT, DELETE };