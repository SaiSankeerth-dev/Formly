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
  env: {
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      "https://jvzvfpfzhmidsztfexsd.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      "sb_publishable_3asBWnzHlx_AKzwDFvWhWA_j5Zod3Yd",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      "sb_publishable_3asBWnzHlx_AKzwDFvWhWA_j5Zod3Yd",
  },
  async rewrites() {
    return [
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
    ];
  },
};

export default nextConfig;
