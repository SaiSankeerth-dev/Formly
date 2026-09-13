import assert from "assert";
import { signSessionToken } from "../src/lib/server/db.ts";
import { GET as getChat, POST as postChat } from "../src/app/api/ai/chat/route.ts";
import { NextRequest } from "next/server";
import { pgQuery, getAuthoritativeDb } from "../src/lib/server/pg-db.ts";

console.log("========================================================");
console.log("   SEVA SAARTHI — GEMINI AI INTEGRATION & RESILIENCE TEST");
console.log("========================================================");

async function runTests() {
  await getAuthoritativeDb();

  // Test 1: Guest / unauthenticated citizen can chat without 401 error
  console.log("\n--- 1. Testing Guest Citizen Seamless Chat ---");
  const unauthGetReq = new NextRequest("http://localhost:3000/api/ai/chat");
  const unauthGetRes = await getChat(unauthGetReq);
  assert.strictEqual(unauthGetRes.status, 200, "GET /api/ai/chat should return 200 with empty list for guest");
  const unauthGetData = await unauthGetRes.json();
  assert.strictEqual(unauthGetData.success, true);
  console.log("✓ Guest GET /api/ai/chat returned 200 OK");

  const unauthPostReq = new NextRequest("http://localhost:3000/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "hi" }),
  });
  const unauthPostRes = await postChat(unauthPostReq);
  assert.strictEqual(unauthPostRes.status, 200, "POST /api/ai/chat should return 200 for guest chat");
  const unauthPostData = await unauthPostRes.json();
  assert.strictEqual(unauthPostData.success, true);
  assert.ok(unauthPostData.message && unauthPostData.message.length > 0, "Guest must receive a response");
  console.log("✓ Guest POST /api/ai/chat returned 200 OK with response:", unauthPostData.message.slice(0, 60) + "...");

  // Create two distinct citizen sessions for multi-user isolation testing
  const userAId = "u_11111111-1111-4111-8111-111111111111";
  const userBId = "u_22222222-2222-4222-8222-222222222222";

  await pgQuery(
    `INSERT INTO users (id, name, email, phone, "passwordHash", salt, role)
     VALUES ($1, 'Citizen A', 'citizenA@example.com', '9876543211', 'hash', 'salt', 'Applicant / Citizen'),
            ($2, 'Citizen B', 'citizenB@example.com', '9876543212', 'hash', 'salt', 'Applicant / Citizen')
     ON CONFLICT (id) DO NOTHING`,
    [userAId, userBId]
  );

  const tokenA = signSessionToken({
    userId: userAId,
    name: "Citizen A",
    email: "citizenA@example.com",
    role: "Applicant / Citizen",
  });

  const tokenB = signSessionToken({
    userId: userBId,
    name: "Citizen B",
    email: "citizenB@example.com",
    role: "Applicant / Citizen",
  });

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await pgQuery(
    `INSERT INTO sessions (token, "userId", "expiresAt")
     VALUES ($1, $2, $3), ($4, $5, $3)
     ON CONFLICT DO NOTHING`,
    [tokenA, userAId, expiresAt, tokenB, userBId]
  );

  // Test 2: Authenticated list conversations
  console.log("\n--- 2. Testing Authenticated Conversation Management ---");
  const authGetReqA = new NextRequest("http://localhost:3000/api/ai/chat", {
    headers: { cookie: `FORMLY_CITIZEN_SESSION=${tokenA}` },
  });
  const authGetResA = await getChat(authGetReqA);
  assert.strictEqual(authGetResA.status, 200, "Authenticated user A should retrieve conversations");
  const authGetDataA = await authGetResA.json();
  assert.strictEqual(authGetDataA.success, true);
  console.log("✓ Authenticated Citizen A successfully listed conversations");

  // Test 3: Multi-User Conversation Isolation (Anti-IDOR)
  console.log("\n--- 3. Testing Multi-User Conversation Isolation (Anti-IDOR) ---");
  const convIdA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const userAUuid = userAId.replace(/^u_/, "");
  const userBUuid = userBId.replace(/^u_/, "");

  await pgQuery(
    `INSERT INTO ai_conversations (id, user_id, title)
     VALUES ($1, $2, 'Citizen A PAN inquiry')
     ON CONFLICT (id) DO NOTHING`,
    [convIdA, userAUuid]
  );

  await pgQuery(
    `INSERT INTO ai_messages (id, conversation_id, user_id, role, content)
     VALUES (gen_random_uuid(), $1, $2, 'user', 'Confidential Citizen A inquiry')
     ON CONFLICT DO NOTHING`,
    [convIdA, userAUuid]
  );

  // User A can access own conversation
  const userAConvReq = new NextRequest(`http://localhost:3000/api/ai/chat?conversationId=${convIdA}`, {
    headers: { cookie: `FORMLY_CITIZEN_SESSION=${tokenA}` },
  });
  const userAConvRes = await getChat(userAConvReq);
  assert.strictEqual(userAConvRes.status, 200, "Citizen A should be able to view their own conversation");
  const userAConvData = await userAConvRes.json();
  assert.strictEqual(userAConvData.conversation.title, "Citizen A PAN inquiry");
  console.log("✓ Citizen A successfully retrieved their own conversation");

  // User B CANNOT access User A conversation
  const userBConvReq = new NextRequest(`http://localhost:3000/api/ai/chat?conversationId=${convIdA}`, {
    headers: { cookie: `FORMLY_CITIZEN_SESSION=${tokenB}` },
  });
  const userBConvRes = await getChat(userBConvReq);
  assert.strictEqual(userBConvRes.status, 403, "Citizen B must receive 403 Forbidden when accessing Citizen A conversation");
  console.log("✓ Citizen B attempting to read Citizen A conversation was strictly blocked with 403 Forbidden");

  // Test 4: Rate-limiting protection
  console.log("\n--- 4. Testing Rate Limiting Protection ---");
  const burstRequests = Array.from({ length: 20 }, (_, i) => {
    const rateReq = new NextRequest("http://localhost:3000/api/ai/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: `FORMLY_CITIZEN_SESSION=${tokenA}`,
      },
      body: JSON.stringify({ message: `Burst test message ${i}` }),
    });
    return postChat(rateReq);
  });
  const results = await Promise.all(burstRequests);
  const rateLimitedHit = results.some((r) => r.status === 429);
  assert.strictEqual(rateLimitedHit, true, "Burst requests must trigger 429 Too Many Requests");
  console.log("✓ Rate limiting successfully triggered 429 Too Many Requests");

  console.log("\n========================================================");
  console.log("   ALL GEMINI AI TESTS PASSED (100%)");
  console.log("========================================================");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
