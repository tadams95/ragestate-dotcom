/** @type {import('next').NextConfig} */
const nextConfig = {
  // Skip ESLint during production builds to avoid requiring eslint as a dep
  eslint: {
    ignoreDuringBuilds: true,
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

export default nextConfig;
