export const disciplineSeverities = ["WARNING", "SP1", "SP2", "SP3"] as const;
export const disciplineStatuses = ["OPEN", "FOLLOW_UP", "RESOLVED", "CANCELLED"] as const;

export function disciplineDate(value: unknown, optional = false) {
  const text = String(value ?? "").trim();
  if (!text && optional) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error("DATE");
  const date = new Date(`${text}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== text) throw new Error("DATE");
  return date;
}

export function tenantDisciplineRecord(companyId: string, id: string) {
  if (!companyId || !id) throw new Error("TENANT_SCOPE");
  return { id, companyId, deletedAt: null } as const;
}
