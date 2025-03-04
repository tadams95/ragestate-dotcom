/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure SWC is used for compilation
  swcMinify: true,
  
  // Disable Babel in favor of SWC
  experimental: {
    forceSwcTransforms: true,
  },
  
  // Your other Next.js configuration
}

module.exports = nextConfig
