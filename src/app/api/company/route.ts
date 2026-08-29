import { requirePermission } from "@/lib/authorization";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().or(z.literal("")),
  phone: z.string().trim().max(30),
  address: z.string().trim().max(500),
  timezone: z.enum(["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura"]),
  currency: z.enum(["IDR", "USD"]),
  defaultLanguage: z.enum(["id", "en"]),
  dateFormat: z.enum(["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

export async function POST(request: NextRequest) {
  try {
    const tenant = await requirePermission("company", "edit");
    const parsed = schema.safeParse(Object.fromEntries(await request.formData()));
    if (!parsed.success) return NextResponse.redirect(new URL("/settings/company?error=validation", request.url), 303);
    const previous = await db.company.findUniqueOrThrow({ where: { id: tenant.companyId } });
    const data = { ...parsed.data, email: parsed.data.email || null, phone: parsed.data.phone || null, address: parsed.data.address || null };
    await db.$transaction([
      db.company.update({ where: { id: tenant.companyId }, data }),
      db.auditLog.create({ data: { companyId: tenant.companyId, actorUserId: tenant.session.userId, action: "UPDATE", module: "company", entityType: "Company", entityId: tenant.companyId, previousValue: previous, newValue: data, userAgent: request.headers.get("user-agent") } }),
    ]);
    return NextResponse.redirect(new URL("/settings/company?saved=1", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/dashboard", request.url), 303);
  }
}

