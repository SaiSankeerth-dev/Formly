import { NextResponse } from "next/server";
import { authenticateSession, getUserProfileFields, updateUserProfileField } from "@/lib/server/db";
import { checkOnboardingStatus, computeProfileStrength } from "@/lib/constants/profile";
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
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const fields = await getUserProfileFields(user.id);
  const { isComplete, currentStep, profileMap } = checkOnboardingStatus(fields, user);
  const score = computeProfileStrength(fields);

  return NextResponse.json({
    success: true,
    data: fields,
    completed: isComplete,
    currentStep,
    completionScore: score,
    profileMap,
    user: {
      id: user.id,
      name: user.name,
      firstName: user.name ? user.name.split(" ")[0] : "Citizen",
      email: user.email,
      phone: user.phone,
    },
  });
}

export async function POST(request: Request) {
  return handleProfileUpdate(request);
}

export async function PATCH(request: Request) {
  return handleProfileUpdate(request);
}

async function handleProfileUpdate(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { field_name, value, fields } = body;

    // Support batch update (e.g. from onboarding wizard steps)
    if (fields && typeof fields === "object") {
      const updatedFields = [];
      for (const [key, val] of Object.entries(fields)) {
        if (typeof val === "string" || typeof val === "number") {
          const updated = await updateUserProfileField(user.id, key, String(val));
          updatedFields.push(updated);
        }
      }
      const allFields = await getUserProfileFields(user.id);
      const { isComplete, currentStep, profileMap } = checkOnboardingStatus(allFields, user);
      const score = computeProfileStrength(allFields);

      return NextResponse.json({
        success: true,
        message: `${updatedFields.length} profile fields updated successfully`,
        data: allFields,
        completed: isComplete,
        currentStep,
        completionScore: score,
        profileMap,
      });
    }

    if (!field_name) {
      return NextResponse.json({ success: false, error: "field_name or fields is required" }, { status: 400 });
    }

    const updatedField = await updateUserProfileField(user.id, field_name, value ? String(value) : "");
    const allFields = await getUserProfileFields(user.id);
    const { isComplete, currentStep, profileMap } = checkOnboardingStatus(allFields, user);
    const score = computeProfileStrength(allFields);

    return NextResponse.json({
      success: true,
      message: `Profile field '${field_name}' updated successfully`,
      data: updatedField,
      allFields,
      completed: isComplete,
      currentStep,
      completionScore: score,
      profileMap,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Invalid payload" }, { status: 400 });
  }
}

