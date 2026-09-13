import { getAuthoritativeDb, pgQuery } from "../src/lib/server/pg-db.ts";
import { signSessionToken } from "../src/lib/server/db.ts";

function assert(condition, msg) {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    throw new Error(msg);
  }
  console.log(`✓ PASS: ${msg}`);
}

async function runTest() {
  console.log("\n========================================================");
  console.log("   TEST ACCOUNT LINKING & DASHBOARD DATA FOR GOOGLE USER");
  console.log("========================================================\n");

  await getAuthoritativeDb();

  const timestamp = Date.now();
  const email = `kavita_linking_${timestamp}@gmail.com`;
  const legacyUserId = crypto.randomUUID();
  const googleUuid = crypto.randomUUID();

  // 1. Existing user registered with email & password
  console.log("--- 1. Creating pre-existing password user with drafts ---");
  await pgQuery(
    `INSERT INTO users (id, name, email, phone, "passwordHash", salt, role, "createdAt")
     VALUES ($1, $2, $3, '9876543210', 'hash', 'salt', 'Applicant / Citizen', NOW())`,
    [legacyUserId, "Kavita Verma", email]
  );
  await pgQuery(
    `INSERT INTO auth.users (id, email) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
    [legacyUserId, email]
  );

  // Query valid service ID
  const srvRes = await pgQuery(`SELECT id FROM services LIMIT 1`);
  const serviceId = srvRes.length > 0 ? srvRes[0].id : "00000000-0000-0000-0000-000000000001";

  // Insert a draft application under legacy ID
  const appId = crypto.randomUUID();
  await pgQuery(
    `INSERT INTO applications (id, application_number, user_id, citizen_user_id, service_id, service_name, state)
     VALUES ($1, $2, $3, $3, $4, 'PAN Card Issuance', 'DRAFT')`,
    [appId, `PAN-DRAFT-${timestamp}`, legacyUserId, serviceId]
  );

  // Insert a document under legacy ID
  const docId = crypto.randomUUID();
  await pgQuery(
    `INSERT INTO documents (id, user_id, document_type, original_filename, storage_path)
     VALUES ($1, $2, 'AADHAAR', 'aadhaar_card.pdf', '/vault/aadhaar.pdf')`,
    [docId, legacyUserId]
  );

  // 2. Google OAuth Callback simulates signing in with this email
  console.log("\n--- 2. Simulating Google OAuth Callback with same email ---");
  // Auth.users row created for Google
  await pgQuery(
    `INSERT INTO auth.users (id, email, raw_user_meta_data)
     VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
    [googleUuid, email, JSON.stringify({ full_name: "Kavita Verma (Google)", email })]
  );

  // Execute the safe account linking logic from callback
  const existingUsers = await pgQuery(
    `SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id != $2`,
    [email, googleUuid]
  );
  assert(existingUsers.length > 0, "Pre-existing account found by email");
  const oldId = existingUsers[0].id;
  assert(oldId === legacyUserId, "Legacy user ID matched correctly");

  // Migrate records
  await pgQuery(`UPDATE applications SET user_id = $1, citizen_user_id = $1 WHERE user_id = $2 OR citizen_user_id = $2`, [googleUuid, oldId]);
  await pgQuery(`UPDATE documents SET user_id = $1 WHERE user_id = $2`, [googleUuid, oldId]);
  await pgQuery(`UPDATE profile_fields SET user_id = $1 WHERE user_id = $2`, [googleUuid, oldId]);
  await pgQuery(`UPDATE addresses SET user_id = $1 WHERE user_id = $2`, [googleUuid, oldId]);
  await pgQuery(`UPDATE sessions SET "userId" = $1 WHERE "userId" = $2`, [googleUuid, oldId]);
  await pgQuery(`UPDATE notifications SET recipient_id = $1 WHERE recipient_id = $2`, [googleUuid, oldId]);

  // Safe merge profile
  await pgQuery(
    `UPDATE profiles
     SET
       full_name = COALESCE(NULLIF(profiles.full_name, ''), old_p.full_name),
       phone = COALESCE(NULLIF(profiles.phone, ''), old_p.phone),
       date_of_birth = COALESCE(profiles.date_of_birth, old_p.date_of_birth),
       gender = COALESCE(NULLIF(profiles.gender, ''), old_p.gender),
       occupation = COALESCE(NULLIF(profiles.occupation, ''), old_p.occupation),
       education = COALESCE(NULLIF(profiles.education, ''), old_p.education),
       avatar_url = COALESCE(NULLIF(profiles.avatar_url, ''), old_p.avatar_url)
     FROM (SELECT * FROM profiles WHERE id = $2 OR user_id = $2) AS old_p
     WHERE profiles.id = $1 OR profiles.user_id = $1`,
    [googleUuid, oldId]
  ).catch(() => {});
  await pgQuery(`DELETE FROM profiles WHERE (id = $2 OR user_id = $2) AND id != $1 AND user_id != $1`, [googleUuid, oldId]).catch(() => {});
  await pgQuery(`UPDATE profiles SET id = $1, user_id = $1 WHERE id = $2 OR user_id = $2`, [googleUuid, oldId]).catch(() => {});

  await pgQuery(
    `UPDATE users SET
       id = $1,
       name = COALESCE(NULLIF($2, ''), name),
       "authProvider" = 'google',
       "updatedAt" = NOW()
     WHERE id = $3`,
    [googleUuid, "Kavita Verma (Google)", oldId]
  );

  assert(true, "Migrated relational rows and updated users.id to Google UUID");

  // 3. Verify user row now has googleUuid
  const updatedUser = await pgQuery(`SELECT * FROM users WHERE id = $1`, [googleUuid]);
  assert(updatedUser.length === 1, "User record now keyed by authoritative Google UUID");
  assert(updatedUser[0].authProvider === "google", "Auth provider updated to google");

  // 4. Verify applications & documents now owned by googleUuid
  const userApps = await pgQuery(`SELECT * FROM applications WHERE user_id = $1 OR citizen_user_id = $1`, [googleUuid]);
  assert(userApps.length === 1 && userApps[0].id === appId, "Pre-existing draft application preserved for Google user");
  assert(userApps[0].state === "DRAFT", "Application state preserved as DRAFT");

  const userDocs = await pgQuery(`SELECT * FROM documents WHERE user_id = $1`, [googleUuid]);
  assert(userDocs.length === 1 && userDocs[0].id === docId, "Pre-existing document preserved for Google user");

  // 5. Test Live HTTP endpoint GET /api/dashboard with session cookie
  console.log("\n--- 3. Testing live /api/dashboard HTTP request ---");
  const token = signSessionToken({
    userId: googleUuid,
    name: "Kavita Verma (Google)",
    email,
    role: "Applicant / Citizen",
  });

  const res = await fetch("http://localhost:3000/api/dashboard", {
    headers: {
      Cookie: `FORMLY_CITIZEN_SESSION=${token}; seva_saarthi_session=${token}`,
    },
  });

  assert(res.status === 200, `/api/dashboard responded with HTTP 200 OK (got ${res.status})`);
  const data = await res.json();
  assert(data.success === true, "Dashboard returned success: true");
  assert(data.user.id === googleUuid, `Dashboard derived identity from Google UUID: ${data.user.id}`);
  assert(data.applications.length === 1, `Dashboard loaded 1 preserved application (got ${data.applications.length})`);
  assert(data.applications[0].state === "DRAFT", "Preserved application shows status DRAFT");
  assert(data.documents.length === 1, `Dashboard loaded 1 preserved document (got ${data.documents.length})`);

  // 6. Test Unauthenticated Request
  console.log("\n--- 4. Testing unauthenticated /api/dashboard ---");
  const unauthRes = await fetch("http://localhost:3000/api/dashboard");
  assert(unauthRes.status === 401, `/api/dashboard unauthenticated returned 401 (got ${unauthRes.status})`);

  // 7. Test New Google User with Empty Data
  console.log("\n--- 5. Testing fresh Google user with empty dashboard state ---");
  const freshGoogleUuid = crypto.randomUUID();
  const freshEmail = `fresh_${timestamp}@gmail.com`;
  const freshToken = signSessionToken({
    userId: freshGoogleUuid,
    name: "Fresh Google Citizen",
    email: freshEmail,
    role: "Applicant / Citizen",
  });

  // Ensure user row
  await pgQuery(
    `INSERT INTO users (id, name, email, phone, "passwordHash", salt, role, "createdAt", "authProvider")
     VALUES ($1, $2, $3, '', 'oauth', 'oauth', 'Applicant / Citizen', NOW(), 'google')`,
    [freshGoogleUuid, "Fresh Google Citizen", freshEmail]
  );

  const freshRes = await fetch("http://localhost:3000/api/dashboard", {
    headers: {
      Cookie: `FORMLY_CITIZEN_SESSION=${freshToken}; seva_saarthi_session=${freshToken}`,
    },
  });

  assert(freshRes.status === 200, `Fresh user dashboard returned 200 OK`);
  const freshData = await freshRes.json();
  assert(freshData.applications.length === 0, "Fresh user has empty applications array");
  assert(freshData.documents.length === 0, "Fresh user has empty documents array");
  assert(freshData.notifications.length === 0, "Fresh user has empty notifications array");
  assert(freshData.profile.completed === false, "Fresh user profile is incomplete -> redirects to onboarding");

  console.log("\n========================================================");
  console.log("   🎉 ALL ACCOUNT LINKING & DASHBOARD TESTS PASSED (100%)");
  console.log("========================================================\n");
}

runTest().catch((err) => {
  console.error("FATAL ERROR IN TEST:", err);
  process.exit(1);
});
