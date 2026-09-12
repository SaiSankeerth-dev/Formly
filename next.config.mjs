/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@electric-sql/pglite"],
  allowedDevOrigins: [
    "average-lexmark-beverages-sees.trycloudflare.com",
    "*.trycloudflare.com",
    "seva-saarthi-eight.vercel.app",
    "*.vercel.app",
  ],
  outputFileTracingIncludes: {
    "/api/**/*": ["./supabase/**/*", "./data/**/*"],
  },
  async rewrites() {
    return [
      {
        source: "/government",
        destination: "/gov",
      },
      {
        source: "/government/applications",
        destination: "/gov/applications",
      },
      {
        source: "/government/applications/:id",
        destination: "/gov/workspace/:id",
      },
      {
        source: "/gov/application-queue",
        destination: "/gov/queue",
      },
      {
        source: "/gov/review",
        destination: "/gov/applications",
      },
      {
        source: "/gov/returned",
        destination: "/gov/applications?filter=returned",
      },
      {
        source: "/government/:path*",
        destination: "/gov/:path*",
      },
    ];
  },
};

export default nextConfig;
