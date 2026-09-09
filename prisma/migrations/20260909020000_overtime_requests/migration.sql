CREATE TABLE IF NOT EXISTS "OvertimeRequest" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "employeeId" TEXT NOT NULL,
  "typeName" TEXT NOT NULL, "workDate" TIMESTAMP(3) NOT NULL, "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL, "totalMinutes" INTEGER NOT NULL, "reason" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING', "reviewedById" TEXT, "reviewNotes" TEXT,
  "reviewedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OvertimeRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "OvertimeRequest_companyId_status_workDate_idx" ON "OvertimeRequest"("companyId", "status", "workDate");
CREATE INDEX IF NOT EXISTS "OvertimeRequest_companyId_employeeId_workDate_idx" ON "OvertimeRequest"("companyId", "employeeId", "workDate");
DO $$ BEGIN ALTER TABLE "OvertimeRequest" ADD CONSTRAINT "OvertimeRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "OvertimeRequest" ADD CONSTRAINT "OvertimeRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
