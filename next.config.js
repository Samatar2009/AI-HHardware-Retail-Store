const createNextIntlPlugin = require('next-intl/plugin')
const withNextIntl = createNextIntlPlugin()

/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  fallbacks: {
    document: '/offline',
  },
  runtimeCaching: [
    {
      // Cache API routes for product catalog (stale-while-revalidate)
      urlPattern: /^\/api\/(products|categories|public)/,
      handler: 'StaleWhileRevalidate',
      options: { cacheName: 'api-catalog', expiration: { maxAgeSeconds: 300 } },
    },
    {
      // Cache Supabase Storage images (cache-first, 7 days)
      urlPattern: /\.supabase\.co\/storage/,
      handler: 'CacheFirst',
      options: { cacheName: 'supabase-images', expiration: { maxAgeSeconds: 604800 } },
    },
    {
      // POS API routes — handled by the custom offline queue (src/lib/offline-queue.ts),
      // not by the service worker's cache, so the network call must fail outright when offline.
      // `options: {}` is required here even though NetworkOnly needs no cache options: with
      // `fallbacks.document` set, next-pwa 5.6.0 unconditionally reads `c.options.precacheFallback`
      // on every runtimeCaching entry and throws if `options` is missing.
      urlPattern: /^\/api\/pos/,
      handler: 'NetworkOnly',
      options: {},
    },
  ],
})

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['sharp', 'twilio'],
  },
}

module.exports = withNextIntl(withPWA(nextConfig))
