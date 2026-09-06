/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  agentRules: false,
  allowedDevOrigins: [
    "average-lexmark-beverages-sees.trycloudflare.com",
    "*.trycloudflare.com",
  ],
};

export default nextConfig;
