/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@chesslens/shared"],
};

module.exports = nextConfig;
