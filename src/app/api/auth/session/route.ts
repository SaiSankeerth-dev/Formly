import { NextResponse } from "next/server";
import { getAuthenticatedCitizenUser } from "@/lib/server/auth";

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedCitizenUser(request);

    if (!user) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        role: user.role,
        avatar: (user as any).avatar || "",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ authenticated: false, error: err.message }, { status: 500 });
  }
}

