import { db } from "@/lib/db";
import { createSessionToken, sessionCookie } from "@/lib/auth";
import { clearLoginAttempts, consumeLoginAttempt } from "@/lib/rate-limit";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const loginSchema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(8).max(128) });

function redirectWithError(request: NextRequest, code: string) {
  return NextResponse.redirect(new URL(`/login?error=${code}`, request.url), 303);
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const form = await request.formData();
  const parsed = loginSchema.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return redirectWithError(request, "invalid_input");

  const rateKey = `${ip}:${parsed.data.email}`;
  if (!consumeLoginAttempt(rateKey).allowed) return redirectWithError(request, "rate_limited");

  const user = await db.user.findFirst({
    where: { email: parsed.data.email, isActive: true, deletedAt: null },
    include: {
      memberships: {
        where: { status: "ACTIVE", company: { status: "ACTIVE", deletedAt: null } },
        include: { company: true, role: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  const valid = user ? await bcrypt.compare(parsed.data.password, user.passwordHash) : false;

  if (!user || !valid) {
    if (user) await db.loginHistory.create({ data: { userId: user.id, success: false, ipAddress: ip, userAgent: request.headers.get("user-agent") } });
    return redirectWithError(request, "invalid_credentials");
  }

  const membership = user.memberships[0] ?? null;
  if (user.platformRole !== "SUPER_ADMIN" && !membership) return redirectWithError(request, "company_unavailable");

  const token = await createSessionToken({
    userId: user.id,
    companyId: membership?.companyId ?? null,
    roleId: membership?.roleId ?? null,
    platformRole: user.platformRole,
  });

  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
    db.loginHistory.create({ data: { userId: user.id, success: true, ipAddress: ip, userAgent: request.headers.get("user-agent") } }),
  ]);
  clearLoginAttempts(rateKey);

  const response = NextResponse.redirect(new URL(user.platformRole === "SUPER_ADMIN" ? "/platform" : "/dashboard", request.url), 303);
  response.cookies.set(sessionCookie.name, token, sessionCookie.options);
  return response;
}

