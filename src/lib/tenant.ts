import { db } from "@/lib/db";
import { readSession } from "@/lib/auth";

export class AccessDeniedError extends Error {}

export async function requireTenant() {
  const session = await readSession();
  if (!session?.userId || !session.companyId) throw new AccessDeniedError("Tenant access required");

  const membership = await db.membership.findFirst({
    where: {
      userId: session.userId,
      companyId: session.companyId,
      status: "ACTIVE",
      company: { status: "ACTIVE", deletedAt: null },
    },
    include: { role: true, company: true },
  });

  if (!membership) throw new AccessDeniedError("Active company membership not found");
  return { session, membership, companyId: membership.companyId };
}

export async function tenantEmployeeRepo() {
  const { companyId } = await requireTenant();
  return {
    list: () => db.employee.findMany({ where: { companyId, deletedAt: null }, orderBy: { fullName: "asc" } }),
    byId: (id: string) => db.employee.findFirst({ where: { id, companyId, deletedAt: null } }),
  };
}

