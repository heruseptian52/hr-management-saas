-- Additive migration: department-level shift eligibility and protected off-days.
CREATE TABLE "DepartmentScheduleRule" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "departmentId" TEXT NOT NULL,
  "allowedShiftIds" JSONB NOT NULL DEFAULT '[]',
  "forbiddenOffWeekdays" JSONB NOT NULL DEFAULT '[]',
  "rotation" TEXT NOT NULL DEFAULT 'DAILY',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DepartmentScheduleRule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DepartmentScheduleRule_departmentId_key" ON "DepartmentScheduleRule"("departmentId");
CREATE INDEX "DepartmentScheduleRule_companyId_idx" ON "DepartmentScheduleRule"("companyId");

ALTER TABLE "DepartmentScheduleRule"
  ADD CONSTRAINT "DepartmentScheduleRule_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DepartmentScheduleRule"
  ADD CONSTRAINT "DepartmentScheduleRule_departmentId_fkey"
  FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;
