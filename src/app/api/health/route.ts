import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    await db.user.findFirst({ select: { id: true } });
    return NextResponse.json({ status: "ok", database: "connected", accounts: "connected" });
  } catch (error) {
    const prismaError = error as { code?: string; meta?: { modelName?: string; column?: string } };
    return NextResponse.json({
      status: "degraded",
      database: "unavailable",
      diagnostic: { code: prismaError.code ?? "unknown", model: prismaError.meta?.modelName ?? null, column: prismaError.meta?.column ?? null },
    }, { status: 503 });
  }
}
