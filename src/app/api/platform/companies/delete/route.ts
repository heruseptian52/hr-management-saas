import { appUrl } from "@/lib/app-url";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/platform";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ companyId: z.string().cuid() });

export async function POST(request: NextRequest) {
  try {
    const session = await requireSuperAdmin();
    const parsed = schema.safeParse(Object.fromEntries(await request.formData()));
    if (!parsed.success) return NextResponse.redirect(new URL("/platform?error=delete_validation", appUrl(request)), 303);

    const company = await db.company.findFirst({ where: { id: parsed.data.companyId, deletedAt: null } });
    if (!company) return NextResponse.redirect(new URL("/platform?error=company_not_found", appUrl(request)), 303);

    await db.$transaction(async transaction => {
      await transaction.company.update({ where: { id: company.id }, data: { status: "INACTIVE", deletedAt: new Date() } });
      await transaction.membership.updateMany({ where: { companyId: company.id }, data: { status: "SUSPENDED" } });
      await transaction.auditLog.create({ data: {
        companyId: company.id,
        actorUserId: session.userId,
        action: "SOFT_DELETE",
        module: "platform.company",
        entityType: "Company",
        entityId: company.id,
        previousValue: { code: company.code, name: company.name, status: company.status },
        newValue: { status: "INACTIVE", deletedAt: new Date().toISOString() },
      } });
    });

    return NextResponse.redirect(new URL(`/platform?deleted=${encodeURIComponent(company.name)}`, appUrl(request)), 303);
  } catch {
    return NextResponse.redirect(new URL("/platform?error=delete_failed", appUrl(request)), 303);
  }
}
