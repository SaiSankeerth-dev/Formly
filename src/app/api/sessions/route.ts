import { NextResponse } from "next/server";
import { authenticateSession, getCitizenSessions, saveCitizenSession } from "@/lib/server/db";
import { cookies } from "next/headers";

async function getAuthenticatedUser(request: Request) {
  const cookieStore = await cookies();
  const token =
    cookieStore.get("FORMLY_CITIZEN_SESSION")?.value ||
    cookieStore.get("formly_citizen_session")?.value ||
    cookieStore.get("seva_saarthi_session")?.value ||
    (request.headers.get("Authorization")?.startsWith("Bearer ")
      ? request.headers.get("Authorization")?.substring(7)
      : null);

  if (!token) return null;
  return await authenticateSession(token);
}

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const sessions = await getCitizenSessions(user.id);
    return NextResponse.json({ success: true, sessions });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { serviceId, serviceName, department, officialUrl, status, nextAction } = body;

    if (!serviceId || !serviceName || !officialUrl) {
      return NextResponse.json({ success: false, error: "Missing required session fields" }, { status: 400 });
    }

    const session = await saveCitizenSession(user.id, {
      serviceId,
      serviceName,
      department: department || "Government Department",
      officialUrl,
      status: status || "Work in progress",
      nextAction: nextAction || "Continue form",
    });

    return NextResponse.json({ success: true, session });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
