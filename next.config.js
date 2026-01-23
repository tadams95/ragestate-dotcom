/* eslint-disable */
const bundleAnalyzer = require('@next/bundle-analyzer');

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Disable Babel in favor of SWC (swcMinify is default in Next.js 15+)
  experimental: {
    forceSwcTransforms: true,
  },

  reactStrictMode: true,

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.shopify.com',
        port: '',
        pathname: '/**', // Match all paths under the hostname
      },
      {
        protocol: 'https',
        hostname: 'ragestate.myshopify.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**', // Match all paths under the hostname
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**', // Match all paths under the hostname
      },
      // Add Tumblr domain
      {
        protocol: 'https',
        hostname: '64.media.tumblr.com',
        port: '',
        pathname: '/**',
      },
      // Add Pinterest domain
      {
        protocol: 'https',
        hostname: 'i.pinimg.com',
        port: '',
        pathname: '/**',
      },
      // Google profile pictures (for Google Sign-In)
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
    ],
  },

  env: {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'https://ragestate.com',
  },

  // Headers for deep linking verification files
  async headers() {
    return [
      {
        source: '/.well-known/apple-app-site-association',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
      },
    ];
  },
};

// Wrap with bundle analyzer when ANALYZE=true
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

// Use CommonJS export instead of ES modules
module.exports = withBundleAnalyzer(nextConfig);
