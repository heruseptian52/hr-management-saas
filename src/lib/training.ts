export const trainingStatuses = ["DRAFT", "OPEN", "ONGOING", "COMPLETED", "CANCELLED"] as const;
export const attendanceStatuses = ["REGISTERED", "PRESENT", "ABSENT"] as const;
export const completionStatuses = ["PENDING", "PASSED", "FAILED"] as const;

export function parseTrainingDate(value: unknown) {
  const text = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error("DATE");
  const date = new Date(`${text}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== text) throw new Error("DATE");
  return date;
}

export function tenantTrainingRecord(companyId: string, id: string) {
  if (!companyId || !id) throw new Error("TENANT_SCOPE");
  return { id, companyId, deletedAt: null } as const;
}

export function validateTrainingRange(startDate: Date, endDate: Date) {
  if (endDate < startDate) throw new Error("DATE_RANGE");
}
