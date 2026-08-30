import { appUrl } from "@/lib/app-url";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/platform";
import { ownerPermissions } from "@/lib/permissions";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,20}$/),
  name: z.string().trim().min(2).max(120),
  ownerName: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(128),
  timezone: z.enum(["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura"]),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireSuperAdmin();
    const parsed = createSchema.safeParse(Object.fromEntries(await request.formData()));
    if (!parsed.success) return NextResponse.redirect(new URL("/platform?error=validation", appUrl(request)), 303);
    const company = await db.$transaction(async transaction => {
      const passwordHash = await bcrypt.hash(parsed.data.password, 12);
      const created = await transaction.company.create({ data: { code: parsed.data.code, name: parsed.data.name, email: parsed.data.email, timezone: parsed.data.timezone } });
      const role = await transaction.role.create({ data: { companyId: created.id, name: "Owner", isSystem: true, permissions: ownerPermissions } });
      const owner = await transaction.user.create({ data: { email: parsed.data.email, fullName: parsed.data.ownerName, passwordHash } });
      await transaction.membership.create({ data: { userId: owner.id, companyId: created.id, roleId: role.id } });
      await transaction.auditLog.create({ data: { companyId: created.id, actorUserId: session.userId, action: "CREATE", module: "platform.company", entityType: "Company", entityId: created.id, newValue: { code: created.code, name: created.name, status: created.status } } });
      return created;
    });
    return NextResponse.redirect(new URL(`/platform?saved=${company.code}`, appUrl(request)), 303);
  } catch {
    return NextResponse.redirect(new URL("/platform?error=duplicate", appUrl(request)), 303);
  }
}
