import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedCitizenUser } from "@/lib/server/auth";
import {
  generateSaarthiResponse,
  generateLocalFallbackResponse,
  SaarthiMessageInput,
} from "@/lib/server/gemini";
import { getAuthoritativeDb, pgQuery, resolveActorUuid } from "@/lib/server/pg-db";
import crypto from "crypto";

// Rate limiting in-memory store: Map<userId, timestamp[]>
const rateLimitMap = new Map<string, number[]>();
const MAX_REQUESTS_PER_WINDOW = 15;
const WINDOW_MS = 60 * 1000; // 1 minute

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(userId) || [];
  const validTimestamps = timestamps.filter((t) => now - t < WINDOW_MS);

  if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    rateLimitMap.set(userId, validTimestamps);
    return true;
  }

  validTimestamps.push(now);
  rateLimitMap.set(userId, validTimestamps);
  return false;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedCitizenUser(request);
    if (!user) {
      // Guest or unauthenticated citizen: return empty conversations gracefully without 401
      return NextResponse.json({
        success: true,
        conversations: [],
        messages: [],
      });
    }

    const userUuid = await resolveActorUuid("CITIZEN", user.id);
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");

    await getAuthoritativeDb();

    if (conversationId) {
      // Validate ownership: user can only retrieve their own conversation
      const convRows = await pgQuery(
        `SELECT id, user_id, title, created_at, updated_at
         FROM ai_conversations
         WHERE id = $1 AND user_id = $2`,
        [conversationId, userUuid]
      );

      if (convRows.length === 0) {
        return NextResponse.json(
          { success: false, error: "Forbidden: Conversation not found or access denied" },
          { status: 403 }
        );
      }

      const messageRows = await pgQuery(
        `SELECT id, conversation_id, role, content, intent, metadata, created_at
         FROM ai_messages
         WHERE conversation_id = $1 AND user_id = $2
         ORDER BY created_at ASC`,
        [conversationId, userUuid]
      );

      return NextResponse.json({
        success: true,
        conversation: convRows[0],
        messages: messageRows,
      });
    }

    // List recent conversations for the authenticated user
    const conversations = await pgQuery(
      `SELECT id, title, created_at, updated_at
       FROM ai_conversations
       WHERE user_id = $1
       ORDER BY updated_at DESC
       LIMIT 20`,
      [userUuid]
    );

    return NextResponse.json({
      success: true,
      conversations,
    });
  } catch (error: any) {
    console.error("[API ai/chat GET]", error);
    return NextResponse.json({ success: true, conversations: [], messages: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Citizen authentication (supports both authenticated citizen and guest visitors)
    const user = await getAuthenticatedCitizenUser(request);
    const actorId = user ? user.id : "guest_citizen";
    let userUuid: string;
    try {
      userUuid = await resolveActorUuid("CITIZEN", actorId);
    } catch {
      userUuid = "00000000-0000-0000-0000-000000000001";
    }

    // 2. Rate limiting per user / actor
    if (isRateLimited(userUuid)) {
      return NextResponse.json(
        {
          success: false,
          error: "RATE_LIMITED",
          message: "Too many requests. Please wait a moment before asking Saarthi again.",
        },
        { status: 429 }
      );
    }

    // 3. Request validation
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body", message: "Please provide a valid query." },
        { status: 400 }
      );
    }

    const { message, conversationId: reqConvId, context } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { success: false, error: "Message content cannot be empty", message: "Please type a message to start chatting." },
        { status: 400 }
      );
    }

    if (message.length > 4000) {
      return NextResponse.json(
        { success: false, error: "Message exceeds maximum allowed length (4000 characters)", message: "Please keep your message under 4000 characters." },
        { status: 400 }
      );
    }

    let activeConvId = reqConvId || crypto.randomUUID();
    const history: SaarthiMessageInput[] = [];

    // 4. Conversation persistence (graceful try-catch so DB never blocks AI reply)
    try {
      await getAuthoritativeDb();

      if (reqConvId) {
        // If an authenticated user provided an existing conversationId, verify ownership
        if (user) {
          const checkRows = await pgQuery(
            `SELECT id FROM ai_conversations WHERE id = $1 AND user_id = $2`,
            [reqConvId, userUuid]
          );
          if (checkRows.length > 0) {
            activeConvId = reqConvId;
          } else {
            activeConvId = crypto.randomUUID();
          }
        }
      }

      // Ensure conversation record exists
      await pgQuery(
        `INSERT INTO ai_conversations (id, user_id, title, created_at, updated_at)
         VALUES ($1, $2, $3, now(), now())
         ON CONFLICT (id) DO UPDATE SET updated_at = now()`,
        [activeConvId, userUuid, message.trim().slice(0, 60)]
      );

      // Retrieve recent conversation history
      const historyRows = await pgQuery<{ role: "user" | "assistant" | "system"; content: string }>(
        `SELECT role, content FROM ai_messages
         WHERE conversation_id = $1
         ORDER BY created_at ASC
         LIMIT 10`,
        [activeConvId]
      );

      for (const r of historyRows) {
        history.push({ role: r.role, content: r.content });
      }

      // Record user message
      const userMsgId = crypto.randomUUID();
      await pgQuery(
        `INSERT INTO ai_messages (id, conversation_id, user_id, role, content, created_at)
         VALUES ($1, $2, $3, 'user', $4, now())`,
        [userMsgId, activeConvId, userUuid, message.trim()]
      );
    } catch (dbErr: any) {
      console.warn("[API ai/chat DB]", dbErr?.message || dbErr);
    }

    // 5. Call Saarthi AI (Gemini with resilient smart fallback)
    const aiResponse = await generateSaarthiResponse(message.trim(), history, context);

    // 6. Record assistant message in DB (non-fatal)
    try {
      const assistantMsgId = crypto.randomUUID();
      await pgQuery(
        `INSERT INTO ai_messages (id, conversation_id, user_id, role, content, intent, metadata, created_at)
         VALUES ($1, $2, $3, 'assistant', $4, $5, $6, now())`,
        [
          assistantMsgId,
          activeConvId,
          userUuid,
          aiResponse.text,
          aiResponse.intent,
          JSON.stringify({ suggestedLink: aiResponse.suggestedLink, modelUsed: aiResponse.modelUsed }),
        ]
      );
    } catch (dbErr: any) {
      console.warn("[API ai/chat DB assistant msg]", dbErr?.message || dbErr);
    }

    return NextResponse.json({
      success: true,
      conversationId: activeConvId,
      message: aiResponse.text,
      intent: aiResponse.intent,
      suggestedLink: aiResponse.suggestedLink,
      serviceId: aiResponse.serviceId,
      modelUsed: aiResponse.modelUsed,
    });
  } catch (error: any) {
    console.error("[API ai/chat POST unhandled]", error);
    const fallback = generateLocalFallbackResponse("hi");
    return NextResponse.json({
      success: true,
      message: fallback.text,
      intent: fallback.intent,
      modelUsed: "local-fallback",
    });
  }
}
