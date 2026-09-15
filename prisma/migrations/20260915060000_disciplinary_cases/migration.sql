CREATE TABLE "DisciplinaryCase" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "caseNumber" TEXT NOT NULL,
  "incidentDate" TIMESTAMP(3) NOT NULL,
  "category" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'WARNING',
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "actionTaken" TEXT,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "validUntil" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "resolution" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "DisciplinaryCase_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "DisciplinaryDocument" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "disciplinaryCaseId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "fileData" BYTEA NOT NULL,
  "uploadedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "DisciplinaryDocument_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DisciplinaryCase_companyId_caseNumber_key" ON "DisciplinaryCase"("companyId", "caseNumber");
CREATE INDEX "DisciplinaryCase_companyId_employeeId_status_incidentDate_deletedAt_idx" ON "DisciplinaryCase"("companyId", "employeeId", "status", "incidentDate", "deletedAt");
CREATE INDEX "DisciplinaryDocument_companyId_disciplinaryCaseId_deletedAt_idx" ON "DisciplinaryDocument"("companyId", "disciplinaryCaseId", "deletedAt");
ALTER TABLE "DisciplinaryCase" ADD CONSTRAINT "DisciplinaryCase_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DisciplinaryCase" ADD CONSTRAINT "DisciplinaryCase_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DisciplinaryDocument" ADD CONSTRAINT "DisciplinaryDocument_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DisciplinaryDocument" ADD CONSTRAINT "DisciplinaryDocument_disciplinaryCaseId_fkey" FOREIGN KEY ("disciplinaryCaseId") REFERENCES "DisciplinaryCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
UPDATE "Role"
SET "permissions" = COALESCE("permissions", '{}'::jsonb) || '{"discipline":["view","create","edit","delete","approve","export"]}'::jsonb
WHERE "isSystem" = TRUE AND LOWER("name") = 'owner';
