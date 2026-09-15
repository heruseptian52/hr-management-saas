import { appUrl } from "@/lib/app-url";
import { requirePermission } from "@/lib/authorization";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const allowed = new Set(["application/pdf", "image/jpeg", "image/png"]);
const clean = (value: FormDataEntryValue | null, max = 180) => String(value ?? "").trim().slice(0, max);

export async function POST(req: NextRequest) {
  try {
    const tenant = await requirePermission("recruitment", "edit");
    const form = await req.formData(), action = clean(form.get("action"), 20) || "UPLOAD", candidateId = clean(form.get("candidateId"), 80);
    const candidate = await db.candidate.findFirstOrThrow({ where: { id: candidateId, companyId: tenant.companyId, deletedAt: null }, select: { id: true } });
    if (action === "DELETE") {
      const id = clean(form.get("id"), 80);
      const item = await db.candidateDocument.findFirstOrThrow({ where: { id, candidateId: candidate.id, companyId: tenant.companyId, deletedAt: null } });
      await db.$transaction([
        db.candidateDocument.update({ where: { id }, data: { deletedAt: new Date() } }),
        db.auditLog.create({ data: { companyId: tenant.companyId, actorUserId: tenant.session.userId, action: "DELETE", module: "recruitment", entityType: "CandidateDocument", entityId: id, previousValue: { candidateId, title: item.title, fileName: item.fileName } } }),
      ]);
    } else {
      const file = form.get("file"), title = clean(form.get("title"));
      if (!(file instanceof File) || !file.size || file.size > 5 * 1024 * 1024 || !allowed.has(file.type) || !title) throw new Error("FILE");
      const item = await db.candidateDocument.create({ data: { companyId: tenant.companyId, candidateId, title, fileName: file.name.slice(0, 255), mimeType: file.type, fileSize: file.size, fileData: Buffer.from(await file.arrayBuffer()), uploadedById: tenant.session.userId } });
      await db.auditLog.create({ data: { companyId: tenant.companyId, actorUserId: tenant.session.userId, action: "CREATE", module: "recruitment", entityType: "CandidateDocument", entityId: item.id, newValue: { candidateId, title, fileName: item.fileName, fileSize: item.fileSize } } });
    }
    return NextResponse.redirect(new URL("/recruitment?saved=1", appUrl(req)), 303);
  } catch { return NextResponse.redirect(new URL("/recruitment?error=document", appUrl(req)), 303); }
}
