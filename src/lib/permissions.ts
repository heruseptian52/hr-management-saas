export const actions = ["view", "create", "edit", "delete", "approve", "export"] as const;
export type PermissionAction = (typeof actions)[number];
export type PermissionMap = Record<string, PermissionAction[]>;

export function hasPermission(
  permissions: unknown,
  module: string,
  action: PermissionAction,
) {
  if (!permissions || typeof permissions !== "object" || Array.isArray(permissions)) return false;
  const values = (permissions as PermissionMap)[module];
  return Array.isArray(values) && values.includes(action);
}

export const ownerPermissions: PermissionMap = {
  company: [...actions],
  roles: [...actions],
  employees: [...actions],
  branches: [...actions],
  departments: [...actions],
  positions: [...actions],
  shifts: [...actions],
  schedules: [...actions],
  audit: ["view", "export"],
};
