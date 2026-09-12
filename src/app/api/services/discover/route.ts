import { NextRequest, NextResponse } from "next/server";
import { discoverGovernmentServices } from "@/lib/discovery/portal-discovery";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || "";

    const results = discoverGovernmentServices(query);

    return NextResponse.json({
      success: true,
      query,
      count: results.length,
      data: results,
    });
  } catch (err: any) {
    console.error("[Discover API Error]:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Unable to read the verified service registry",
        details: err?.message,
      },
      { status: 500 }
    );
  }
}
