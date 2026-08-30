import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/platform";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const clientSchema = z.object({ companyId: z.string().min(1), fullName: z.string().trim().min(2).max(120), email: z.string().trim().toLowerCase().email(), password: z.string().max(128) });
const baseUrl = (request: NextRequest) => process.env.APP_URL ?? request.nextUrl.origin;

export async function POST(request: NextRequest) {
  try {
    const session = await requireSuperAdmin();
    const parsed = clientSchema.safeParse(Object.fromEntries(await request.formData()));
    if (!parsed.success || (parsed.data.password && parsed.data.password.length < 8)) return NextResponse.redirect(new URL("/platform?error=client_validation", baseUrl(request)), 303);
    await db.$transaction(async transaction => {
      const company = await transaction.company.findFirst({ where: { id: parsed.data.companyId, deletedAt: null } });
      const role = await transaction.role.findFirst({ where: { companyId: parsed.data.companyId, name: "Owner", deletedAt: null } });
      if (!company || !role) throw new Error("COMPANY_NOT_FOUND");
      const membership = await transaction.membership.findFirst({ where: { companyId: company.id, roleId: role.id, status: "ACTIVE" }, include: { user: true } });
      if (membership) {
        await transaction.user.update({ where: { id: membership.userId }, data: { email: parsed.data.email, fullName: parsed.data.fullName, platformRole: "COMPANY_USER", isActive: true, deletedAt: null, ...(parsed.data.password ? { passwordHash: await bcrypt.hash(parsed.data.password, 12) } : {}) } });
      } else {
        if (parsed.data.password.length < 8) throw new Error("PASSWORD_REQUIRED");
        const user = await transaction.user.create({ data: { email: parsed.data.email, fullName: parsed.data.fullName, passwordHash: await bcrypt.hash(parsed.data.password, 12) } });
        await transaction.membership.create({ data: { userId: user.id, companyId: company.id, roleId: role.id } });
      }
      await transaction.auditLog.create({ data: { companyId: company.id, actorUserId: session.userId, action: "UPDATE", module: "platform.client", entityType: "User", newValue: { email: parsed.data.email, role: "Owner" } } });
    });
    return NextResponse.redirect(new URL("/platform?clientSaved=1", baseUrl(request)), 303);
  } catch {
    return NextResponse.redirect(new URL("/platform?error=client_duplicate", baseUrl(request)), 303);
  }
}
