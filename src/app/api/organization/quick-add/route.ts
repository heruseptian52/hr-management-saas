import { requirePermission } from "@/lib/authorization";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ kind: z.enum(["branch", "department", "position"]), name: z.string().trim().min(2).max(100), code: z.string().trim().toUpperCase().max(20).optional() });
const modules = { branch: "branches", department: "departments", position: "positions" } as const;
function baseCode(name: string) { return name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 20) || "DATA"; }

export async function POST(request: NextRequest) {
  try {
    const parsed = schema.parse(await request.json()), tenant = await requirePermission(modules[parsed.kind], "create");
    const duplicateName = parsed.kind === "branch"
      ? await db.branch.count({ where: { companyId: tenant.companyId, name: { equals: parsed.name, mode: "insensitive" } } })
      : parsed.kind === "department"
        ? await db.department.count({ where: { companyId: tenant.companyId, name: { equals: parsed.name, mode: "insensitive" } } })
        : await db.position.count({ where: { companyId: tenant.companyId, name: { equals: parsed.name, mode: "insensitive" } } });
    if (duplicateName) return NextResponse.json({ error: "Nama tersebut sudah tersedia" }, { status: 409 });
    const preferred = parsed.code?.replace(/[^A-Z0-9_-]/g, "") || baseCode(parsed.name);
    if (!/^[A-Z0-9_-]{2,20}$/.test(preferred)) return NextResponse.json({ error: "Kode harus 2–20 karakter" }, { status: 400 });
    let code = preferred;
    for (let number = 2; number <= 99; number++) {
      const used = parsed.kind === "branch" ? await db.branch.count({ where: { companyId: tenant.companyId, code } }) : parsed.kind === "department" ? await db.department.count({ where: { companyId: tenant.companyId, code } }) : await db.position.count({ where: { companyId: tenant.companyId, code } });
      if (!used) break;
      if (parsed.code) return NextResponse.json({ error: "Kode sudah digunakan" }, { status: 409 });
      const suffix = `-${number}`; code = `${preferred.slice(0, 20 - suffix.length)}${suffix}`;
    }
    const created = parsed.kind === "branch"
      ? await db.branch.create({ data: { companyId: tenant.companyId, code, name: parsed.name, timezone: tenant.membership.company.timezone, radiusM: 100 } })
      : parsed.kind === "department"
        ? await db.department.create({ data: { companyId: tenant.companyId, code, name: parsed.name } })
        : await db.position.create({ data: { companyId: tenant.companyId, code, name: parsed.name } });
    await db.auditLog.create({ data: { companyId: tenant.companyId, actorUserId: tenant.session.userId, action: "QUICK_ADD", module: modules[parsed.kind], entityType: parsed.kind, entityId: created.id, newValue: { code: created.code, name: created.name } } });
    return NextResponse.json({ id: created.id, code: created.code, name: created.name });
  } catch (error) {
    console.error("ORGANIZATION_QUICK_ADD", error);
    return NextResponse.json({ error: "Data baru gagal disimpan" }, { status: 400 });
  }
}
