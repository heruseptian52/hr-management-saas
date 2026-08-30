import { appUrl } from "@/lib/app-url";
import { requirePermission } from "@/lib/authorization";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const base = z.object({ kind: z.enum(["branch", "department", "position"]), code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{2,20}$/), name: z.string().trim().min(2).max(100) });

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const parsed = base.safeParse(Object.fromEntries(form));
  if (!parsed.success) return NextResponse.redirect(new URL("/organization?error=validation", appUrl(request)), 303);
  const module = parsed.data.kind === "branch" ? "branches" : parsed.data.kind === "department" ? "departments" : "positions";
  try {
    const tenant = await requirePermission(module, "create");
    const created = await db.$transaction(async transaction => {
      if (parsed.data.kind === "branch") return transaction.branch.create({ data: { companyId: tenant.companyId, code: parsed.data.code, name: parsed.data.name, address: String(form.get("address") || "") || null, radiusM: Math.min(5000, Math.max(10, Number(form.get("radiusM")) || 100)), timezone: String(form.get("timezone") || tenant.membership.company.timezone) } });
      if (parsed.data.kind === "department") return transaction.department.create({ data: { companyId: tenant.companyId, code: parsed.data.code, name: parsed.data.name } });
      return transaction.position.create({ data: { companyId: tenant.companyId, code: parsed.data.code, name: parsed.data.name } });
    });
    await db.auditLog.create({ data: { companyId: tenant.companyId, actorUserId: tenant.session.userId, action: "CREATE", module, entityType: parsed.data.kind, entityId: created.id, newValue: { code: created.code, name: created.name } } });
    return NextResponse.redirect(new URL(`/organization?saved=${parsed.data.kind}`, appUrl(request)), 303);
  } catch {
    return NextResponse.redirect(new URL("/organization?error=duplicate", appUrl(request)), 303);
  }
}

