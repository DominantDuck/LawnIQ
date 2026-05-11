# SwiftQuote CRM Setup Instructions

## Quick Setup Guide

### 1. Environment Configuration ✅

The environment variables are managed in two places:

1. **Root `.env` file**: Contains all configuration variables
2. **Frontend `.env.local` file**: Contains Next.js-specific variables (automatically created)

**Your setup is already complete!** The configuration has been automatically set up with:
- ✅ Google Maps API Key configured
- ✅ Database URL configured
- ✅ JWT Secret configured

### 2. Database Schema Deployment

Run the CRM schema in your Vercel Postgres database:

1. Open Vercel Dashboard → Storage → Your Database → Query tab
2. Copy the contents of `frontend/db/crm-schema.sql`
3. Paste and execute in the Query tab

### 3. Test the Health Check

Visit `/api/health` in your app to verify:
- ✅ Database connection
- ✅ JWT secret configured
- ✅ CRM tables exist
- ✅ Google Maps API key

### 4. Test Authentication

1. Start your app: `npm run dev` (from frontend directory)
2. Click "Sign In" in the header
3. Create a test account
4. Verify user info appears in header with logout button

## CRM Features Ready

Once setup is complete, you'll have:

- ✅ **User Authentication** (JWT-based, 7-day sessions)
- ✅ **Enhanced Sign-in Modal** (improved UX, accessibility, validation)
- ✅ **Consolidated Environment** (single `.env` file)
- ✅ **Database Health Checks** (`/api/health` endpoint)
- ✅ **Integration Ready** (for contacts, properties, quotes)

## Troubleshooting

### Database Issues
- Check `/api/health` for connection status
- Verify POSTGRES_URL in root `.env` file
- Ensure CRM schema is deployed

### Environment Issues
- Ensure all variables are in root `.env` file (not frontend/.env)
- Restart development server after environment changes
- Check console for specific error messages

### Authentication Issues
- Verify JWT_SECRET is set and at least 32 characters
- Check browser console for specific errors
- Test with `/api/auth/me` endpoint directly

## Next Steps

With Phase 1 complete, you're ready for:

- **Phase 2**: Contact Management
- **Phase 3**: Property Integration
- **Phase 4**: Quote Generation
- **Phase 5**: Lead Pipeline