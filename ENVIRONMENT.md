# Environment Variable Configuration

## How It Works

Your SwiftQuote application uses a **dual environment file approach** to handle both centralized configuration and Next.js requirements:

### 📁 File Structure

```
LawnIQ/
├── .env                    # Root configuration (all variables)
├── .env.example           # Root template
├── frontend/
│   ├── .env.local         # Next.js-specific variables (auto-created)
│   └── .env.example       # Frontend reference
└── backend/
    └── .env.example       # Backend reference
```

### 🔧 How Environment Variables Are Loaded

1. **Root `.env`**: Contains the master configuration
2. **Frontend `.env.local`**: Contains copies of variables that Next.js needs
3. **Next.js automatically loads** variables from `frontend/.env.local` when running from the frontend directory

## ✅ Your Current Configuration

All environment variables are properly configured:

- `GOOGLE_MAPS_API_KEY`: ✅ Configured
- `POSTGRES_URL`: ✅ Connected to Neon database
- `JWT_SECRET`: ✅ Configured
- `CRM_SCHEMA`: ✅ All tables deployed

## 🚀 Verification

Check your configuration status at: `http://localhost:3000/api/health`

Expected response:
```json
{
  "status": "ok",
  "services": {
    "database": { "status": "connected" },
    "authentication": { "status": "configured" },
    "maps": { "status": "configured" },
    "crm_schema": { "status": "ready" }
  }
}
```

## 🔄 Making Changes

To update environment variables:

1. **Update the root `.env` file** with your changes
2. **Update `frontend/.env.local`** with the same values
3. **Restart the development server** to pick up changes

## 🚨 Important Notes

- **Never commit** `.env.local` or `.env` files (they contain secrets)
- **Always restart** the development server after environment changes
- **For production**: Set environment variables in your Vercel dashboard

Your environment is now properly configured and ready for development! 🎉