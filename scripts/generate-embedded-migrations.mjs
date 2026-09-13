import fs from "fs";
import path from "path";

const root = process.cwd();
const m1Path = path.join(root, "supabase", "migrations", "001_formly_schema.sql");
const seedPath = path.join(root, "supabase", "seed.sql");
const m2Path = path.join(root, "supabase", "migrations", "002_formly_v2_unified_schema.sql");
const m3Path = path.join(root, "supabase", "migrations", "003_supabase_auth_rls.sql");

const m1 = fs.readFileSync(m1Path, "utf8");
const seed = fs.readFileSync(seedPath, "utf8");
const m2 = fs.readFileSync(m2Path, "utf8");
const m3 = fs.existsSync(m3Path) ? fs.readFileSync(m3Path, "utf8") : "";

const outContent = `// Auto-generated embedded migrations for serverless / Vercel execution
// In serverless environments (AWS Lambda / Vercel), files outside the compilation trace
// are not available on the read-only filesystem at /var/task. Embedding ensures 100% schema availability.

export const EMBEDDED_MIGRATION_001 = ${JSON.stringify(m1)};

export const EMBEDDED_SEED_SQL = ${JSON.stringify(seed)};

export const EMBEDDED_MIGRATION_002 = ${JSON.stringify(m2)};

export const EMBEDDED_MIGRATION_003 = ${JSON.stringify(m3)};
`;

const target = path.join(root, "src", "lib", "server", "embedded-migrations.ts");
fs.writeFileSync(target, outContent, "utf8");
console.log("Successfully generated embedded-migrations.ts (" + (outContent.length / 1024).toFixed(2) + " KB)");
