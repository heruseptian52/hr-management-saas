import { readSession } from "@/lib/auth";

export async function requireSuperAdmin() {
  const session = await readSession();
  if (!session || session.platformRole !== "SUPER_ADMIN") throw new Error("FORBIDDEN");
  return session;
}

