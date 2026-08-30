import { requirePermission } from "@/lib/authorization";
import { parseWorkbook } from "@/lib/excel";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    await requirePermission("employees", "create");
    const file = (await request.formData()).get("file");
    if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function" || file.size > 10 * 1024 * 1024 || !/\.(xlsx|xls)$/i.test(file.name)) return NextResponse.json({ error: "File XLSX/XLS maksimal 10 MB" }, { status: 400 });
    return NextResponse.json({ filename: file.name, ...parseWorkbook(Buffer.from(await file.arrayBuffer())) });
  } catch { return NextResponse.json({ error: "File tidak dapat dibaca" }, { status: 400 }); }
}
