/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => config, // keep existing config
  experimental: {
    turbo: false, // 🔥 Disable Turbopack
  },
};

module.exports = nextConfig;
