import { db } from "@/lib/db";

let ready: Promise<void> | null = null;

export function ensureSchedulingRuleSchema() {
  if (!ready) ready = (async () => {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "DepartmentScheduleRule" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "companyId" TEXT NOT NULL,
        "departmentId" TEXT NOT NULL,
        "allowedShiftIds" JSONB NOT NULL DEFAULT '[]',
        "forbiddenOffWeekdays" JSONB NOT NULL DEFAULT '[]',
        "rotation" TEXT NOT NULL DEFAULT 'DAILY',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL
      )
    `);
    await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "DepartmentScheduleRule_departmentId_key" ON "DepartmentScheduleRule"("departmentId")`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "DepartmentScheduleRule_companyId_idx" ON "DepartmentScheduleRule"("companyId")`);
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PositionScheduleRule" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "companyId" TEXT NOT NULL,
        "positionId" TEXT NOT NULL,
        "allowedShiftIds" JSONB NOT NULL DEFAULT '[]',
        "forbiddenOffWeekdays" JSONB NOT NULL DEFAULT '[]',
        "rotation" TEXT NOT NULL DEFAULT 'DAILY',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL
      )
    `);
    await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "PositionScheduleRule_positionId_key" ON "PositionScheduleRule"("positionId")`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PositionScheduleRule_companyId_idx" ON "PositionScheduleRule"("companyId")`);
  })().catch(error => { ready = null; throw error; });
  return ready;
}
