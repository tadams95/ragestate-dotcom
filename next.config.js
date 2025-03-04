/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure SWC is used for compilation
  swcMinify: true,

  // Disable Babel in favor of SWC
  experimental: {
    forceSwcTransforms: true,
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.shopify.com",
        port: "",
        pathname: "/**", // Match all paths under the hostname
      },
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        port: "",
        pathname: "/**", // Match all paths under the hostname
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
        pathname: "/**", // Match all paths under the hostname
      },
    ],
  },
};

// Use CommonJS export instead of ES modules
module.exports = nextConfig;
