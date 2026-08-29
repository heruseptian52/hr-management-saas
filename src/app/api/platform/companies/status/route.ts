import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/platform";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ companyId: z.string().cuid(), status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]) });

export async function POST(request: NextRequest) {
  try {
    const session = await requireSuperAdmin();
    const parsed = schema.safeParse(Object.fromEntries(await request.formData()));
    if (!parsed.success) throw new Error("INVALID");
    const previous = await db.company.findFirstOrThrow({ where: { id: parsed.data.companyId, deletedAt: null } });
    await db.$transaction([
      db.company.update({ where: { id: previous.id }, data: { status: parsed.data.status } }),
      db.auditLog.create({ data: { companyId: previous.id, actorUserId: session.userId, action: "STATUS_CHANGE", module: "platform.company", entityType: "Company", entityId: previous.id, previousValue: { status: previous.status }, newValue: { status: parsed.data.status } } }),
    ]);
    return NextResponse.redirect(new URL("/platform?status=updated", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/platform?error=status", request.url), 303);
  }
}

