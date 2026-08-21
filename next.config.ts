import type { NextConfig } from 'next';

const securityHeaders = [
  // Prevent clickjacking
  { key: 'X-Frame-Options', value: 'DENY' },
  // Prevent MIME type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Referrer policy - don't leak full URL in referer headers
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Disable unnecessary browser features
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // Prevent XSS
  { key: 'X-XSS-Protection', value: '1; mode=block' },
];

// HSTS only applies on HTTPS — add in production only
const productionOnlyHeaders = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

const allHeaders = process.env.NODE_ENV === 'production'
  ? [...securityHeaders, ...productionOnlyHeaders]
  : securityHeaders;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: allHeaders,
      },
    ];
  },
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.stylesupply.io';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
