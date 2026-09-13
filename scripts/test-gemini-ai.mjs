import assert from "assert";
import { signSessionToken } from "../src/lib/server/db.ts";
import { isGeminiConfigured } from "../src/lib/server/gemini.ts";
import { GET as getChat, POST as postChat } from "../src/app/api/ai/chat/route.ts";
import { NextRequest } from "next/server";
import { pgQuery, getAuthoritativeDb } from "../src/lib/server/pg-db.ts";

console.log("========================================================");
console.log("   SEVA SAARTHI — GEMINI AI INTEGRATION & SECURITY TEST");
console.log("========================================================");

async function runTests() {
  await getAuthoritativeDb();

  // Test 1: Unauthenticated access rejected
  console.log("\n--- 1. Testing Unauthenticated Access Rejection ---");
  const unauthGetReq = new NextRequest("http://localhost:3000/api/ai/chat");
  const unauthGetRes = await getChat(unauthGetReq);
  assert.strictEqual(unauthGetRes.status, 401, "GET /api/ai/chat should return 401 when unauthenticated");
  console.log("✓ Unauthenticated GET /api/ai/chat returned 401");

  const unauthPostReq = new NextRequest("http://localhost:3000/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "Hello Saarthi" }),
  });
  const unauthPostRes = await postChat(unauthPostReq);
  assert.strictEqual(unauthPostRes.status, 401, "POST /api/ai/chat should return 401 when unauthenticated");
  console.log("✓ Unauthenticated POST /api/ai/chat returned 401");

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

  // Test 3: Fail-closed when GEMINI_API_KEY is missing/unconfigured
  console.log("\n--- 3. Testing Missing Gemini API Key (Fail-Closed 503) ---");
  const prevKey = process.env.GEMINI_API_KEY;
  try {
    delete process.env.GEMINI_API_KEY;
    assert.strictEqual(isGeminiConfigured(), false, "isGeminiConfigured should be false when key is omitted");

    const chatReqNoKey = new NextRequest("http://localhost:3000/api/ai/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: `FORMLY_CITIZEN_SESSION=${tokenA}`,
      },
      body: JSON.stringify({ message: "What is PAN card?" }),
    });

    const chatResNoKey = await postChat(chatReqNoKey);
    assert.strictEqual(chatResNoKey.status, 503, "Should return 503 when GEMINI_API_KEY is missing");
    const noKeyData = await chatResNoKey.json();
    assert.strictEqual(noKeyData.error, "AI_NOT_CONFIGURED");
    assert.ok(noKeyData.message.includes("temporarily unavailable"), "Must return friendly unavailable message without static fallback");
    console.log("✓ Missing GEMINI_API_KEY strictly returned 503 AI_NOT_CONFIGURED (no fake fallback)");
  } finally {
    if (prevKey) process.env.GEMINI_API_KEY = prevKey;
  }

  // Test 4: Multi-User Conversation Isolation (Anti-IDOR)
  console.log("\n--- 4. Testing Multi-User Conversation Isolation (Anti-IDOR) ---");
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

  // Test 5: Rate-limiting protection
  console.log("\n--- 5. Testing Rate Limiting Protection ---");
  // Send rapid requests under User A
  let rateLimitedHit = false;
  for (let i = 0; i < 25; i++) {
    const rateReq = new NextRequest("http://localhost:3000/api/ai/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: `FORMLY_CITIZEN_SESSION=${tokenA}`,
      },
      body: JSON.stringify({ message: `Message ${i}` }),
    });
    const res = await postChat(rateReq);
    if (res.status === 429) {
      rateLimitedHit = true;
      break;
    }
  }
  assert.strictEqual(rateLimitedHit, true, "Rapid requests must eventually trigger 429 Too Many Requests");
  console.log("✓ Rate limiting successfully triggered 429 Too Many Requests to prevent quota exhaustion");

  console.log("\n========================================================");
  console.log("   ALL GEMINI AI TESTS PASSED (100%)");
  console.log("========================================================");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
