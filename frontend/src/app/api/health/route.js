export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/health
 * Database and service health check endpoint
 */
export async function GET(request) {
  try {
    const healthCheck = {
      timestamp: new Date().toISOString(),
      status: 'ok',
      services: {}
    };

    // Check database connection
    if (process.env.POSTGRES_URL) {
      try {
        const { sql } = await import('@vercel/postgres');

        // Simple connectivity test
        const result = await sql`SELECT 1 as test`;

        healthCheck.services.database = {
          status: 'connected',
          message: 'Database connection successful'
        };
      } catch (dbError) {
        console.error('Database health check failed:', dbError);
        healthCheck.services.database = {
          status: 'error',
          message: 'Database connection failed',
          error: process.env.NODE_ENV === 'development' ? dbError.message : 'Connection error'
        };
        healthCheck.status = 'degraded';
      }
    } else {
      healthCheck.services.database = {
        status: 'not_configured',
        message: 'POSTGRES_URL environment variable not set'
      };
    }

    // Check JWT secret
    if (process.env.JWT_SECRET) {
      healthCheck.services.authentication = {
        status: 'configured',
        message: 'JWT secret is configured'
      };
    } else {
      healthCheck.services.authentication = {
        status: 'not_configured',
        message: 'JWT_SECRET environment variable not set'
      };
      healthCheck.status = 'degraded';
    }

    // Check Google Maps API key
    if (process.env.GOOGLE_MAPS_API_KEY) {
      healthCheck.services.maps = {
        status: 'configured',
        message: 'Google Maps API key is configured'
      };
    } else {
      healthCheck.services.maps = {
        status: 'not_configured',
        message: 'GOOGLE_MAPS_API_KEY environment variable not set'
      };
    }

    // Check CRM tables exist (if database is connected)
    if (healthCheck.services.database?.status === 'connected') {
      try {
        const { sql } = await import('@vercel/postgres');

        // Check if users table exists
        const tableCheck = await sql`
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name IN ('users', 'contacts', 'properties', 'leads', 'projects', 'quotes')
        `;

        const existingTables = tableCheck.rows.map(row => row.table_name);
        const requiredTables = ['users', 'contacts', 'properties', 'leads', 'projects', 'quotes'];
        const missingTables = requiredTables.filter(table => !existingTables.includes(table));

        if (missingTables.length === 0) {
          healthCheck.services.crm_schema = {
            status: 'ready',
            message: 'All CRM tables exist',
            tables: existingTables
          };
        } else {
          healthCheck.services.crm_schema = {
            status: 'partial',
            message: `Missing tables: ${missingTables.join(', ')}`,
            existing_tables: existingTables,
            missing_tables: missingTables
          };
          healthCheck.status = 'degraded';
        }
      } catch (schemaError) {
        healthCheck.services.crm_schema = {
          status: 'error',
          message: 'Could not check schema',
          error: process.env.NODE_ENV === 'development' ? schemaError.message : 'Schema check failed'
        };
      }
    }

    // Set overall status based on critical services
    const hasDatabase = healthCheck.services.database?.status === 'connected';
    const hasAuth = healthCheck.services.authentication?.status === 'configured';

    if (!hasDatabase || !hasAuth) {
      healthCheck.status = 'error';
    }

    const statusCode = healthCheck.status === 'ok' ? 200 :
                      healthCheck.status === 'degraded' ? 200 : 503;

    return Response.json(healthCheck, { status: statusCode });

  } catch (error) {
    console.error('Health check error:', error);

    return Response.json({
      timestamp: new Date().toISOString(),
      status: 'error',
      message: 'Health check failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    }, { status: 503 });
  }
}