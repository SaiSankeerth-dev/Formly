import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedCitizenUser } from "@/lib/server/auth";
import { isGeminiConfigured, generateSaarthiResponse, SaarthiMessageInput } from "@/lib/server/gemini";
import { getAuthoritativeDb, pgQuery, resolveActorUuid } from "@/lib/server/pg-db";
import crypto from "crypto";

// Rate limiting in-memory store: Map<userId, timestamp[]>
const rateLimitMap = new Map<string, number[]>();
const MAX_REQUESTS_PER_WINDOW = 20;
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
      return NextResponse.json({ success: false, error: "Unauthorized: Citizen session required" }, { status: 401 });
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
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Citizen authentication
    const user = await getAuthenticatedCitizenUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Citizen authentication required" },
        { status: 401 }
      );
    }

    const userUuid = await resolveActorUuid("CITIZEN", user.id);

    // 2. Rate limiting per user
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

    // 3. Validate Gemini configuration (fail closed with 503 if missing)
    if (!isGeminiConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: "AI_NOT_CONFIGURED",
          message: "Saarthi is temporarily unavailable. Missing AI configuration.",
        },
        { status: 503 }
      );
    }

    // 4. Request validation
    const body = await request.json();
    const { message, conversationId: reqConvId, context } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { success: false, error: "Message content cannot be empty" },
        { status: 400 }
      );
    }

    if (message.length > 4000) {
      return NextResponse.json(
        { success: false, error: "Message exceeds maximum allowed length (4000 characters)" },
        { status: 400 }
      );
    }

    await getAuthoritativeDb();

    // 5. User-owned conversation resolution
    let activeConvId = reqConvId;
    if (activeConvId) {
      // Strictly verify ownership of existing conversation
      const checkRows = await pgQuery(
        `SELECT id FROM ai_conversations WHERE id = $1 AND user_id = $2`,
        [activeConvId, userUuid]
      );
      if (checkRows.length === 0) {
        return NextResponse.json(
          { success: false, error: "Forbidden: Conversation not found or access denied" },
          { status: 403 }
        );
      }
    } else {
      // Create new user-owned conversation
      activeConvId = crypto.randomUUID();
      const title = message.trim().slice(0, 60);
      await pgQuery(
        `INSERT INTO ai_conversations (id, user_id, title, created_at, updated_at)
         VALUES ($1, $2, $3, now(), now())`,
        [activeConvId, userUuid, title]
      );
    }

    // 6. Retrieve conversation history for context
    const historyRows = await pgQuery<{ role: "user" | "assistant" | "system"; content: string }>(
      `SELECT role, content FROM ai_messages
       WHERE conversation_id = $1 AND user_id = $2
       ORDER BY created_at ASC
       LIMIT 10`,
      [activeConvId, userUuid]
    );

    const history: SaarthiMessageInput[] = historyRows.map((r) => ({
      role: r.role,
      content: r.content,
    }));

    // Record user message
    const userMsgId = crypto.randomUUID();
    await pgQuery(
      `INSERT INTO ai_messages (id, conversation_id, user_id, role, content, created_at)
       VALUES ($1, $2, $3, 'user', $4, now())`,
      [userMsgId, activeConvId, userUuid, message.trim()]
    );

    // 7. Call real Gemini AI
    let aiResponse;
    try {
      aiResponse = await generateSaarthiResponse(message.trim(), history, context);
    } catch (genErr: any) {
      console.error("[API ai/chat Gemini error]", genErr);
      const isRateLimitErr =
        genErr?.status === 429 ||
        genErr?.message?.includes("RESOURCE_EXHAUSTED") ||
        genErr?.message?.includes("429");

      if (isRateLimitErr) {
        return NextResponse.json(
          {
            success: false,
            error: "GEMINI_RATE_LIMITED",
            message: "AI service quota reached. Please try again in a minute.",
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: "AI_SERVICE_ERROR",
          message: "Saarthi is temporarily unavailable. Please try again.",
        },
        { status: 503 }
      );
    }

    // 8. Record assistant message
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

    // Update conversation timestamp
    await pgQuery(
      `UPDATE ai_conversations SET updated_at = now() WHERE id = $1 AND user_id = $2`,
      [activeConvId, userUuid]
    );

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
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process AI chat request" },
      { status: 500 }
    );
  }
}
