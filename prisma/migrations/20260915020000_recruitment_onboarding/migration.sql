CREATE TABLE "JobVacancy" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "departmentId" TEXT,
  "positionId" TEXT,
  "openings" INTEGER NOT NULL DEFAULT 1,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "deadline" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "JobVacancy_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Candidate" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "vacancyId" TEXT,
  "fullName" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "nationalId" TEXT,
  "birthDate" TIMESTAMP(3),
  "address" TEXT,
  "source" TEXT,
  "stage" TEXT NOT NULL DEFAULT 'APPLIED',
  "notes" TEXT,
  "employeeId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CandidateDocument" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "candidateId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "fileData" BYTEA NOT NULL,
  "uploadedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "CandidateDocument_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "OnboardingTask" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "candidateId" TEXT NOT NULL,
  "employeeId" TEXT,
  "title" TEXT NOT NULL,
  "dueDate" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "notes" TEXT,
  "completedAt" TIMESTAMP(3),
  "completedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "OnboardingTask_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "JobVacancy_companyId_code_key" ON "JobVacancy"("companyId", "code");
CREATE INDEX "JobVacancy_companyId_status_deletedAt_idx" ON "JobVacancy"("companyId", "status", "deletedAt");
CREATE UNIQUE INDEX "Candidate_employeeId_key" ON "Candidate"("employeeId");
CREATE INDEX "Candidate_companyId_stage_deletedAt_idx" ON "Candidate"("companyId", "stage", "deletedAt");
CREATE INDEX "Candidate_companyId_vacancyId_deletedAt_idx" ON "Candidate"("companyId", "vacancyId", "deletedAt");
CREATE INDEX "CandidateDocument_companyId_candidateId_deletedAt_idx" ON "CandidateDocument"("companyId", "candidateId", "deletedAt");
CREATE INDEX "OnboardingTask_companyId_candidateId_status_deletedAt_idx" ON "OnboardingTask"("companyId", "candidateId", "status", "deletedAt");
CREATE INDEX "OnboardingTask_companyId_employeeId_status_deletedAt_idx" ON "OnboardingTask"("companyId", "employeeId", "status", "deletedAt");
ALTER TABLE "JobVacancy" ADD CONSTRAINT "JobVacancy_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "JobVacancy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CandidateDocument" ADD CONSTRAINT "CandidateDocument_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CandidateDocument" ADD CONSTRAINT "CandidateDocument_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OnboardingTask" ADD CONSTRAINT "OnboardingTask_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OnboardingTask" ADD CONSTRAINT "OnboardingTask_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OnboardingTask" ADD CONSTRAINT "OnboardingTask_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
UPDATE "Role"
SET "permissions" = COALESCE("permissions", '{}'::jsonb) || '{"recruitment":["view","create","edit","delete","approve","export"]}'::jsonb
WHERE "isSystem" = TRUE AND LOWER("name") = 'owner';
