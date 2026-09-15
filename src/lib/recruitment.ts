export const candidateStages = ["APPLIED", "SCREENING", "INTERVIEW", "OFFER", "HIRED", "REJECTED"] as const;
export type CandidateStage = (typeof candidateStages)[number];

export const stageLabels: Record<CandidateStage, string> = {
  APPLIED: "Pelamar Baru",
  SCREENING: "Screening",
  INTERVIEW: "Interview",
  OFFER: "Penawaran",
  HIRED: "Diterima",
  REJECTED: "Ditolak",
};

export function optionalText(value: unknown, max = 255) {
  const text = String(value ?? "").trim();
  return text ? text.slice(0, max) : null;
}

export function optionalDate(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const date = new Date(`${text}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime())) throw new Error("DATE");
  return date;
}

export function normalizeIdentity(value: unknown) {
  const text = optionalText(value, 40);
  return text ? text.replace(/[^0-9]/g, "") || null : null;
}

export function tenantRecord(companyId: string, id: string) {
  if (!companyId || !id) throw new Error("TENANT_SCOPE");
  return { id, companyId, deletedAt: null } as const;
}
