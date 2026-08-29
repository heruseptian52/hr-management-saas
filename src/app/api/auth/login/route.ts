import { db } from "@/lib/db";
import { createSessionToken, sessionCookie } from "@/lib/auth";
import { clearLoginAttempts, consumeLoginAttempt } from "@/lib/rate-limit";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const loginSchema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(8).max(128) });

function redirectWithError(request: NextRequest, code: string) {
  const appUrl = process.env.APP_URL ?? request.nextUrl.origin;
  return NextResponse.redirect(new URL(`/login?error=${code}`, appUrl), 303);
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const form = await request.formData();
  const parsed = loginSchema.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return redirectWithError(request, "invalid_input");

  const rateKey = `${ip}:${parsed.data.email}`;
  if (!consumeLoginAttempt(rateKey).allowed) return redirectWithError(request, "rate_limited");

  const user = await db.user.findUnique({
    where: { email: parsed.data.email },
    select: {
      id: true,
      passwordHash: true,
      platformRole: true,
      isActive: true,
      deletedAt: true,
    },
  });
  const valid = user ? await bcrypt.compare(parsed.data.password, user.passwordHash) : false;

  if (!user || !user.isActive || user.deletedAt || !valid) {
    if (user) await db.loginHistory.create({ data: { userId: user.id, success: false, ipAddress: ip, userAgent: request.headers.get("user-agent") } });
    return redirectWithError(request, "invalid_credentials");
  }

  const membership = await db.membership.findFirst({
    where: {
      userId: user.id,
      status: "ACTIVE",
      company: { is: { status: "ACTIVE", deletedAt: null } },
    },
    orderBy: { createdAt: "asc" },
    select: { companyId: true, roleId: true },
  });
  if (user.platformRole !== "SUPER_ADMIN" && !membership) return redirectWithError(request, "company_unavailable");

  const token = await createSessionToken({
    userId: user.id,
    companyId: membership?.companyId ?? null,
    roleId: membership?.roleId ?? null,
    platformRole: user.platformRole,
  });

  await db.$transaction([
    db.loginHistory.create({ data: { userId: user.id, success: true, ipAddress: ip, userAgent: request.headers.get("user-agent") } }),
  ]);
  clearLoginAttempts(rateKey);

  const appUrl = process.env.APP_URL ?? request.nextUrl.origin;
  const response = NextResponse.redirect(new URL(user.platformRole === "SUPER_ADMIN" ? "/platform" : "/dashboard", appUrl), 303);
  response.cookies.set(sessionCookie.name, token, sessionCookie.options);
  return response;
}
