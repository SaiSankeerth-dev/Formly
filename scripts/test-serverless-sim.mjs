import { PGlite } from "@electric-sql/pglite";
import { getAuthoritativeDb, resetAuthoritativeDb } from "../src/lib/server/pg-db.ts";
import { loginUser } from "../src/lib/server/db.ts";

async function testServerless() {
  process.env.VERCEL = "1";
  process.env.NODE_ENV = "production";
  process.env.SESSION_SECRET = process.env.SESSION_SECRET || "simulated-production-secret-4f8a9e2b1c3d5e7f";

  // Reset any previous db instance
  await resetAuthoritativeDb();

  console.log("Initializing DB in simulated Vercel Serverless environment...");
  const t0 = Date.now();
  const db = await getAuthoritativeDb();
  console.log(`DB initialized in ${Date.now() - t0}ms`);

  // Verify critical tables exist
  const tables = await db.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
  console.log(`Found ${tables.rows.length} public tables in PGlite.`);

  const apps = await db.query(`SELECT count(*) FROM applications`);
  console.log(`Applications table exists, count:`, apps.rows[0]);

  const employees = await db.query(`SELECT count(*) FROM employees`);
  console.log(`Employees table exists, count:`, employees.rows[0]);

  const users = await db.query(`SELECT count(*) FROM users`);
  console.log(`Users table exists, count:`, users.rows[0]);

  console.log("\nAttempting loginUser on simulated Vercel serverless...");
  const citizenLogin = await loginUser("user@gmail.com", "1234567890");
  console.log("Citizen login result:", citizenLogin.user.name, citizenLogin.user.email);

  const officerLogin = await loginUser("officer@gmail.com", "1234567890");
  console.log("Officer login result:", officerLogin.user.name, officerLogin.user.email);

  console.log("\n--- Testing Concurrent Cold-Start Login Requests (10 parallel promises) ---");
  await resetAuthoritativeDb();
  const concurrentLogins = await Promise.all([
    loginUser("user@gmail.com", "1234567890"),
    loginUser("officer@gmail.com", "1234567890"),
    loginUser("user@gmail.com", "1234567890"),
    loginUser("officer@gmail.com", "1234567890"),
    loginUser("test.citizen@formly.local", "Citizen@2026"),
    loginUser("test.officer@formly.gov.local", "GovOfficer@2026"),
    loginUser("user@gmail.com", "1234567890"),
    loginUser("officer@gmail.com", "1234567890"),
    loginUser("user@gmail.com", "1234567890"),
    loginUser("officer@gmail.com", "1234567890"),
  ]);
  console.log(`✓ All 10 concurrent cold-start login requests resolved successfully.`);
  for (let i = 0; i < concurrentLogins.length; i++) {
    if (!concurrentLogins[i].token || !concurrentLogins[i].user?.id) {
      throw new Error(`Concurrent login #${i} returned invalid result`);
    }
  }

  console.log("\nServerless simulation completed with 100% success!");
  process.exit(0);
}

testServerless().catch((err) => {
  console.error("Serverless simulation FAILED:", err);
  process.exit(1);
});
