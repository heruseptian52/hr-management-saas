import { createSessionToken, sessionCookie } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/platform";
import { NextRequest, NextResponse } from "next/server";

function appUrl(request: NextRequest) {
  return process.env.APP_URL ?? request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  let session;
  try {
    session = await requireSuperAdmin();
  } catch {
    return NextResponse.redirect(new URL("/login", appUrl(request)), 303);
  }

  const form = await request.formData();
  const action = String(form.get("action") ?? "enter");

  if (action === "exit") {
    const token = await createSessionToken({ ...session, companyId: null, roleId: null });
    const response = NextResponse.redirect(new URL("/platform", appUrl(request)), 303);
    response.cookies.set(sessionCookie.name, token, sessionCookie.options);
    return response;
  }

  const companyId = String(form.get("companyId") ?? "");
  const company = await db.company.findFirst({ where: { id: companyId, status: "ACTIVE", deletedAt: null } });
  const role = await db.role.findFirst({ where: { companyId, name: "Owner", deletedAt: null } });
  if (!company || !role) return NextResponse.redirect(new URL("/platform?error=company_access", appUrl(request)), 303);

  const token = await createSessionToken({ ...session, companyId: company.id, roleId: role.id });
  const response = NextResponse.redirect(new URL("/dashboard", appUrl(request)), 303);
  response.cookies.set(sessionCookie.name, token, sessionCookie.options);
  return response;
}
