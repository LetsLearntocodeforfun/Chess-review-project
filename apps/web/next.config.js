/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@chesslens/shared"],
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client"],
  },
};

module.exports = nextConfig;
