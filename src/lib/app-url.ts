import type { NextRequest } from "next/server";

export function appUrl(request: NextRequest) {
  const configured = process.env.APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host");
  if (host) {
    const protocol = request.headers.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
    return `${protocol}://${host}`;
  }

  return request.nextUrl.origin;
}
