import { hasPermission, PermissionAction } from "@/lib/permissions";
import { requireTenant } from "@/lib/tenant";

export async function requirePermission(module: string, action: PermissionAction) {
  const tenant = await requireTenant();
  if (!hasPermission(tenant.membership.role.permissions, module, action)) throw new Error("FORBIDDEN");
  return tenant;
}

