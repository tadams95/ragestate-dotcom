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
      // Add Tumblr domain
      {
        protocol: "https",
        hostname: "64.media.tumblr.com",
        port: "",
        pathname: "/**",
      },
      // Add Pinterest domain
      {
        protocol: "https",
        hostname: "i.pinimg.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

// Use CommonJS export instead of ES modules
module.exports = nextConfig;
