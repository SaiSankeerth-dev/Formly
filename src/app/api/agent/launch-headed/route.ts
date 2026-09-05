import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import { authenticateSession, getUserProfileFields } from "@/lib/server/db";
import { cookies } from "next/headers";

function getAuthenticatedUser(request: Request) {
  const cookieStore = cookies();
  const token =
    cookieStore.get("seva_saarthi_session")?.value ||
    (request.headers.get("Authorization")?.startsWith("Bearer ")
      ? request.headers.get("Authorization")?.substring(7)
      : null);

  if (!token) return null;
  return authenticateSession(token);
}

export async function POST(request: Request) {
  try {
    let portalUrl = "https://scholarships.gov.in";
    try {
      const body = await request.json();
      if (body.portalUrl) portalUrl = body.portalUrl;
    } catch {
      // default URL
    }

    const user = getAuthenticatedUser(request);
    const fields = user ? getUserProfileFields(user.id) : [];
    const getVal = (name: string) => fields.find((f) => f.field_name === name)?.value || "";

    const userProfile = {
      fullName: getVal("full_name") || user?.name || "Citizen Applicant",
      firstName: (getVal("full_name") || user?.name || "Citizen").split(" ")[0],
      lastName: (getVal("full_name") || user?.name || "").split(" ").slice(1).join(" "),
      dob: getVal("date_of_birth"),
      gender: getVal("gender") || "Male",
      aadhaarNo: getVal("aadhaar_number"),
      mobile: getVal("phone_number") || user?.phone || "",
      email: getVal("email") || user?.email || "",
      domicileState: getVal("location") || "Delhi",
      college: getVal("college_name"),
      course: getVal("education_degree"),
      rollNo: getVal("roll_number"),
      annualIncome: getVal("annual_income"),
      bankAccount: getVal("bank_account_no"),
      bankIfsc: getVal("bank_ifsc"),
      category: getVal("caste_category") || "General",
    };

    const scriptPath = path.resolve(process.cwd(), "scripts", "run-live-agent.mjs");

    console.log(`[Seva Saarthi Server] Launching Playwright Desktop Agent with profile (${userProfile.fullName}) on: ${portalUrl}`);

    // Spawn detached Node process running the Playwright script
    const child = spawn(process.execPath, [scriptPath], {
      detached: true,
      stdio: "ignore",
      env: {
        ...process.env,
        TARGET_URL: portalUrl,
        USER_PROFILE_JSON: JSON.stringify(userProfile),
      },
    });

    child.unref();

    return NextResponse.json({
      success: true,
      message: `Launched Google Chrome for ${userProfile.fullName} on ${portalUrl}. The browser window is now visible on your desktop.`,
      targetUrl: portalUrl,
      applicant: userProfile.fullName,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to launch browser" }, { status: 500 });
  }
}
