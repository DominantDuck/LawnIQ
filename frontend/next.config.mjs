import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * When USE_EXPRESS_BACKEND=true, proxy /api/* to Express (legacy local dev).
 * Default: Next.js Route Handlers serve /api (Vercel-friendly: config, log-address, stats).
 */
const backend = process.env.BACKEND_URL || 'http://127.0.0.1:3001';
const useExpress = process.env.USE_EXPRESS_BACKEND === 'true';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Avoid tracing the wrong workspace when a parent directory has another lockfile
  outputFileTracingRoot: path.join(__dirname),
  async rewrites() {
    if (!useExpress) {
      return [];
    }
    return [
      {
        source: '/api/:path*',
        destination: `${backend.replace(/\/$/, '')}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
