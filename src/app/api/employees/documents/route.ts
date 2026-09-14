import { appUrl } from "@/lib/app-url";
import { requirePermission } from "@/lib/authorization";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const allowed = new Set(["application/pdf", "image/jpeg", "image/png"]);
const clean = (value: FormDataEntryValue | null, max = 150) => String(value ?? "").trim().slice(0, max);

export async function POST(request: NextRequest) {
  let employeeId = "";
  try {
    const tenant = await requirePermission("employees", "edit");
    const form = await request.formData();
    employeeId = clean(form.get("employeeId"), 80);
    const action = clean(form.get("action"), 20) || "UPLOAD";
    const employee = await db.employee.findFirst({ where: { id: employeeId, companyId: tenant.companyId, deletedAt: null }, select: { id: true } });
    if (!employee) throw new Error("EMPLOYEE");
    if (action === "DELETE") {
      const id = clean(form.get("id"), 80);
      const item = await db.employeeDocument.findFirst({ where: { id, employeeId, companyId: tenant.companyId, deletedAt: null } });
      if (!item) throw new Error("DOCUMENT");
      await db.$transaction([
        db.employeeDocument.update({ where: { id }, data: { deletedAt: new Date() } }),
        db.auditLog.create({ data: { companyId: tenant.companyId, actorUserId: tenant.session.userId, action: "DELETE", module: "employee_documents", entityType: "EmployeeDocument", entityId: id, previousValue: { employeeId, title: item.title, fileName: item.fileName } } }),
      ]);
    } else {
      const file = form.get("file");
      const title = clean(form.get("title"));
      const category = clean(form.get("category"), 80);
      if (!(file instanceof File) || !file.size || file.size > 5 * 1024 * 1024 || !allowed.has(file.type) || !title || !category) throw new Error("FILE");
      const expires = clean(form.get("expiresAt"), 10), expiresAt = expires ? new Date(`${expires}T00:00:00.000Z`) : null;
      if (expiresAt && !Number.isFinite(expiresAt.getTime())) throw new Error("DATE");
      const item = await db.employeeDocument.create({ data: { companyId: tenant.companyId, employeeId, category, title, fileName: file.name.slice(0, 255), mimeType: file.type, fileSize: file.size, fileData: Buffer.from(await file.arrayBuffer()), expiresAt, notes: clean(form.get("notes"), 500) || null, uploadedById: tenant.session.userId } });
      await db.auditLog.create({ data: { companyId: tenant.companyId, actorUserId: tenant.session.userId, action: "CREATE", module: "employee_documents", entityType: "EmployeeDocument", entityId: item.id, newValue: { employeeId, category, title, fileName: item.fileName, fileSize: item.fileSize, expiresAt: expires || null } } });
    }
    return NextResponse.redirect(new URL(`/employees/${employeeId}?documentSaved=1`, appUrl(request)), 303);
  } catch {
    return NextResponse.redirect(new URL(employeeId ? `/employees/${employeeId}?documentError=1` : "/employees?error=document", appUrl(request)), 303);
  }
}
