import { requirePermission } from "@/lib/authorization";
import { db } from "@/lib/db";
import { parseWorkbook } from "@/lib/excel";
import { OrganizationKind, parseOrganizationRows } from "@/lib/organization-import";
import { NextRequest, NextResponse } from "next/server";

const modules = { branch: "branches", department: "departments", position: "positions" } as const;

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const kind = String(form.get("kind")) as OrganizationKind;
    const module = modules[kind];
    const file = form.get("file");
    if (!module || !file || typeof file === "string" || !/\.(xlsx|xls)$/i.test(file.name) || file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Pilih file XLSX/XLS maksimal 10 MB" }, { status: 400 });
    }
    const tenant = await requirePermission(module, "create");
    const parsed = parseWorkbook(Buffer.from(await file.arrayBuffer()));
    const existing = kind === "branch"
      ? await db.branch.findMany({ where: { companyId: tenant.companyId }, select: { code: true, name: true } })
      : kind === "department"
        ? await db.department.findMany({ where: { companyId: tenant.companyId }, select: { code: true, name: true } })
        : await db.position.findMany({ where: { companyId: tenant.companyId }, select: { code: true, name: true } });
    const result = parseOrganizationRows(kind, parsed.headers, parsed.rows, existing);
    return NextResponse.json({ filename: file.name, kind, mapping: result.mapping, rows: result.rows, summary: { total: result.rows.length, new: result.rows.filter(row => row.status === "NEW").length, update: result.rows.filter(row => row.status === "UPDATE").length, error: result.rows.filter(row => row.status === "ERROR").length } });
  } catch (error) {
    console.error("ORGANIZATION_IMPORT_PREVIEW", error);
    return NextResponse.json({ error: "File tidak dapat dibaca atau Anda tidak memiliki izin" }, { status: 400 });
  }
}
