CREATE TABLE "TrainingProgram" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT,
  "provider" TEXT,
  "location" TEXT,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "capacity" INTEGER,
  "cost" DECIMAL(18,2),
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "TrainingProgram_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "TrainingParticipant" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "trainingProgramId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "attendanceStatus" TEXT NOT NULL DEFAULT 'REGISTERED',
  "completionStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "score" INTEGER,
  "certificateNumber" TEXT,
  "certificateUrl" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "TrainingParticipant_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TrainingProgram_companyId_code_key" ON "TrainingProgram"("companyId", "code");
CREATE INDEX "TrainingProgram_companyId_status_startDate_deletedAt_idx" ON "TrainingProgram"("companyId", "status", "startDate", "deletedAt");
CREATE UNIQUE INDEX "TrainingParticipant_trainingProgramId_employeeId_key" ON "TrainingParticipant"("trainingProgramId", "employeeId");
CREATE INDEX "TrainingParticipant_companyId_employeeId_completionStatus_deletedAt_idx" ON "TrainingParticipant"("companyId", "employeeId", "completionStatus", "deletedAt");
ALTER TABLE "TrainingProgram" ADD CONSTRAINT "TrainingProgram_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TrainingParticipant" ADD CONSTRAINT "TrainingParticipant_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TrainingParticipant" ADD CONSTRAINT "TrainingParticipant_trainingProgramId_fkey" FOREIGN KEY ("trainingProgramId") REFERENCES "TrainingProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TrainingParticipant" ADD CONSTRAINT "TrainingParticipant_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
UPDATE "Role"
SET "permissions" = COALESCE("permissions", '{}'::jsonb) || '{"training":["view","create","edit","delete","approve","export"]}'::jsonb
WHERE "isSystem" = TRUE AND LOWER("name") = 'owner';
