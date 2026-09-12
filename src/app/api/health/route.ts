import { NextResponse } from "next/server";
import { getAuthoritativeDb, pgQuery } from "@/lib/server/pg-db";

const START_TIME = Date.now();

export async function GET() {
  try {
    const startTime = Date.now();
    await getAuthoritativeDb();
    const dbTest = await pgQuery(`SELECT 1 as alive`);
    const dbLatencyMs = Date.now() - startTime;

    const isConnected = Array.isArray(dbTest) && dbTest.length > 0;

    return NextResponse.json(
      {
        status: isConnected ? "ok" : "degraded",
        database: isConnected ? "connected" : "disconnected",
        dbLatencyMs,
        environment: process.env.NODE_ENV || "development",
        serverless: Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME),
        uptimeSeconds: Math.floor((Date.now() - START_TIME) / 1000),
        timestamp: new Date().toISOString(),
      },
      { status: isConnected ? 200 : 503 }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        status: "error",
        database: "disconnected",
        error: err.message || "Database connection error",
        environment: process.env.NODE_ENV || "development",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
