import { requirePermission } from "@/lib/authorization";
import { db } from "@/lib/db";
import { actions, PermissionAction, PermissionMap } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ name: z.string().trim().min(2).max(50), permissions: z.array(z.string()).max(100) });
const modules = ["company", "roles", "employees", "branches", "departments", "positions", "audit"];

export async function POST(request: NextRequest) {
  try {
    const tenant = await requirePermission("roles", "create");
    const form = await request.formData();
    const parsed = schema.safeParse({ name: form.get("name"), permissions: form.getAll("permissions") });
    if (!parsed.success) return NextResponse.redirect(new URL("/settings/roles?error=validation", request.url), 303);
    const permissions: PermissionMap = {};
    for (const item of parsed.data.permissions) {
      const [module, action] = item.split(":");
      if (!modules.includes(module) || !actions.includes(action as PermissionAction)) continue;
      (permissions[module] ??= []).push(action as PermissionAction);
    }
    const role = await db.role.create({ data: { companyId: tenant.companyId, name: parsed.data.name, permissions } });
    await db.auditLog.create({ data: { companyId: tenant.companyId, actorUserId: tenant.session.userId, action: "CREATE", module: "roles", entityType: "Role", entityId: role.id, newValue: { name: role.name, permissions } } });
    return NextResponse.redirect(new URL("/settings/roles?saved=1", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/settings/roles?error=duplicate", request.url), 303);
  }
}

