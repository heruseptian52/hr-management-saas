import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    await db.user.findFirst({ select: { id: true } });
    return NextResponse.json({ status: "ok", database: "connected", accounts: "connected" });
  } catch {
    return NextResponse.json({ status: "degraded", database: "unavailable" }, { status: 503 });
  }
}
