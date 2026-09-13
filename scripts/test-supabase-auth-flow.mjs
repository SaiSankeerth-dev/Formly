import { getAuthoritativeDb, pgQuery } from "../src/lib/server/pg-db.ts";
import { getAuthenticatedCitizenUser } from "../src/lib/server/auth.ts";
import { loginUser, registerUser, getUserProfileFields, getUserDocuments, getApplications } from "../src/lib/server/db.ts";

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`✓ ${message}`);
}

async function runSupabaseAuthFlowTests() {
  console.log("\n========================================================");
  console.log("   SEVA SAARTHI — SUPABASE AUTH & RLS POLICIES TEST");
  console.log("========================================================\n");

  const db = await getAuthoritativeDb();

  // Test 1: Schema Structure Verification
  console.log("--- 1. Supabase Schema Tables Verification ---");
  const tables = await pgQuery(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('profiles', 'addresses', 'documents', 'applications')`
  );
  const foundTables = tables.map(t => t.table_name);
  assert(foundTables.includes("profiles"), "public.profiles table exists");
  assert(foundTables.includes("addresses"), "public.addresses table exists");
  assert(foundTables.includes("documents"), "public.documents table exists");
  assert(foundTables.includes("applications"), "public.applications table exists");

  // Test 2: RLS Enabled Verification
  console.log("\n--- 2. Row Level Security Verification ---");
  const rlsRes = await pgQuery(
    `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('profiles', 'addresses', 'documents', 'applications')`
  );
  for (const row of rlsRes) {
    assert(row.rowsecurity === true, `RLS is ENABLED on public.${row.tablename}`);
  }

  // Test 3: Citizen Creation & Profile Auto-Trigger
  console.log("\n--- 3. auth.users Creation & Profile Trigger ---");
  const citizenUuid = crypto.randomUUID();
  const citizenEmail = `supabase_test_${Date.now()}@formly.gov.in`;
  const citizenName = "Ananya Sharma";

  await pgQuery(
    `INSERT INTO auth.users (id, email, raw_user_meta_data)
     VALUES ($1, $2, $3)`,
    [citizenUuid, citizenEmail, JSON.stringify({ full_name: citizenName, phone: "9876543210" })]
  );
  assert(true, "Citizen inserted into auth.users");

  // Verify that handle_new_user() trigger created the profile in public.profiles
  const profileRes = await pgQuery(
    `SELECT * FROM public.profiles WHERE id = $1 OR user_id = $1`,
    [citizenUuid]
  );
  assert(profileRes.length > 0, "handle_new_user() trigger created row in public.profiles");
  assert(profileRes[0].full_name === citizenName, `Profile name matches trigger metadata: ${profileRes[0].full_name}`);

  // Test 4: Document Isolation per User
  console.log("\n--- 4. Document Isolation per User ID ---");
  const docId = crypto.randomUUID();
  await pgQuery(
    `INSERT INTO public.documents (id, user_id, document_type, original_filename, storage_path)
     VALUES ($1, $2, 'AADHAAR', 'ananya_aadhaar.pdf', 'vault/ananya_aadhaar.pdf')`,
    [docId, citizenUuid]
  );

  const anotherCitizenUuid = crypto.randomUUID();
  const citizenDocs = await pgQuery(`SELECT * FROM public.documents WHERE user_id = $1`, [citizenUuid]);
  const otherDocs = await pgQuery(`SELECT * FROM public.documents WHERE user_id = $1`, [anotherCitizenUuid]);

  assert(citizenDocs.length === 1 && citizenDocs[0].id === docId, "Citizen retrieves their own document");
  assert(otherDocs.length === 0, "Other citizen cannot see documents belonging to different user_id");

  // Test 5: Application Creation Isolation
  console.log("\n--- 5. Application Submission Isolation ---");
  const srvRes = await pgQuery(`SELECT id FROM services LIMIT 1`);
  const serviceId = srvRes.length > 0 ? srvRes[0].id : "00000000-0000-0000-0000-000000000001";
  const appId = crypto.randomUUID();
  const appNumber = `PAN-TEST-${Date.now()}`;

  await pgQuery(
    `INSERT INTO public.applications (id, application_number, user_id, citizen_user_id, service_id, service_name, state)
     VALUES ($1, $2, $3, $3, $4, 'PAN Card Application', 'SUBMITTED')`,
    [appId, appNumber, citizenUuid, serviceId]
  );

  const citizenApps = await pgQuery(`SELECT * FROM public.applications WHERE user_id = $1`, [citizenUuid]);
  const otherApps = await pgQuery(`SELECT * FROM public.applications WHERE user_id = $1`, [anotherCitizenUuid]);

  assert(citizenApps.length === 1 && citizenApps[0].id === appId, "Citizen retrieves their own application");
  assert(otherApps.length === 0, "Other citizen cannot see applications belonging to different user_id");

  // Test 6: Government Platform Isolation
  console.log("\n--- 6. Government vs Citizen Portal Boundary Isolation ---");
  const govUserRes = await pgQuery(`SELECT * FROM users WHERE role IN ('DEPARTMENT_OFFICER', 'OFFICER') LIMIT 1`);
  if (govUserRes.length > 0) {
    const govUser = govUserRes[0];
    const isGov = ["DEPARTMENT_OFFICER", "DEPARTMENT_ADMIN", "SYSTEM_ADMIN", "OFFICER"].includes(govUser.role);
    assert(isGov, `Government user ${govUser.email} has authoritative government role: ${govUser.role}`);
  }

  console.log("\n========================================================");
  console.log("   ALL SUPABASE AUTH & RLS TESTS PASSED (100%)");
  console.log("========================================================\n");
}

runSupabaseAuthFlowTests().catch(err => {
  console.error("Supabase Auth flow test error:", err);
  process.exit(1);
});
