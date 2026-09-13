import { NextResponse } from "next/server";
import { getUserProfileFields, updateUserProfileField } from "@/lib/server/db";
import { checkOnboardingStatus, computeProfileStrength } from "@/lib/constants/profile";
import { getAuthenticatedCitizenUser } from "@/lib/server/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const user = await getAuthenticatedCitizenUser(request);
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

export async function PUT(request: Request) {
  return handleProfileUpdate(request);
}

export async function PATCH(request: Request) {
  return handleProfileUpdate(request);
}

async function syncProfileToSupabase(userId: string, fields: Record<string, any>) {
  try {
    const supabase = await createClient();
    const updateObj: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (fields.full_name) updateObj.full_name = String(fields.full_name);
    if (fields.phone || fields.phone_number || fields.mobile) {
      updateObj.phone = String(fields.phone || fields.phone_number || fields.mobile);
    }
    if (fields.date_of_birth || fields.dob) updateObj.date_of_birth = String(fields.date_of_birth || fields.dob);
    if (fields.gender) updateObj.gender = String(fields.gender);
    if (fields.occupation) updateObj.occupation = String(fields.occupation);
    if (fields.education || fields.education_degree) updateObj.education = String(fields.education || fields.education_degree);

    if (Object.keys(updateObj).length > 1) {
      await supabase
        .from("profiles")
        .upsert({ id: userId, user_id: userId, ...updateObj }, { onConflict: "id" });
    }
  } catch {}
}

async function handleProfileUpdate(request: Request) {
  try {
    const user = await getAuthenticatedCitizenUser(request);
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
      await syncProfileToSupabase(user.id, fields);

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
    await syncProfileToSupabase(user.id, { [field_name]: value });

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

