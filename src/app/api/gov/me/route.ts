import { NextRequest, NextResponse } from "next/server";
import { validateGovSession, unauthorizedResponse } from "@/lib/server/auth";
import { getAuthoritativeDb } from "@/lib/server/pg-db";

export async function GET(request: NextRequest) {
  try {
    const auth = await validateGovSession(request);
    if (!auth.success) {
      return auth.error?.toLowerCase().includes("forbidden")
        ? NextResponse.json({ success: false, error: auth.error }, { status: 403 })
        : unauthorizedResponse(auth.error!);
    }

    const employee = auth.employee;

    let departmentName = "Income Tax Department (CBDT) - PAN Division";
    let officeName = "Regional Processing Cell, Hyderabad";

    try {
      const db = await getAuthoritativeDb();
      if (employee.department_id) {
        const dRes = await db.query<{ name: string }>(`SELECT name FROM departments WHERE id = $1`, [employee.department_id]);
        if (dRes.rows && dRes.rows.length > 0 && dRes.rows[0]?.name) {
          departmentName = dRes.rows[0].name;
        }
      }
      if (employee.office_id) {
        const oRes = await db.query<{ name: string; city: string | null }>(`SELECT name, city FROM offices WHERE id = $1`, [employee.office_id]);
        if (oRes.rows && oRes.rows.length > 0 && oRes.rows[0]?.name) {
          const row = oRes.rows[0];
          officeName = row.city ? `${row.name}, ${row.city}` : row.name;
        }
      }
    } catch (dbErr) {
      console.warn("[API gov/me] Database query for department/office metadata failed, falling back to profile", dbErr);
    }

    return NextResponse.json({
      success: true,
      employee: {
        id: employee.employee_code,
        name: employee.full_name,
        email: employee.email,
        role: employee.role === "DEPARTMENT_OFFICER" ? "OFFICER" : employee.role,
        roleTitle:
          employee.role === "DEPARTMENT_OFFICER"
            ? "Department Officer"
            : employee.role === "DEPARTMENT_ADMIN"
            ? "Department Administrator"
            : "System Administrator",
        department: departmentName,
        office: officeName,
      }
    });
  } catch (error: any) {
    console.error("[API gov/me GET]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
