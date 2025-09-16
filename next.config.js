/* eslint-disable */
const bundleAnalyzer = require('@next/bundle-analyzer');

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Ensure SWC is used for compilation
  swcMinify: true,

  // Disable Babel in favor of SWC
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
    ],
  },

  env: {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'https://ragestate.com',
  },
};

// Wrap with bundle analyzer when ANALYZE=true
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

// Use CommonJS export instead of ES modules
module.exports = withBundleAnalyzer(nextConfig);
