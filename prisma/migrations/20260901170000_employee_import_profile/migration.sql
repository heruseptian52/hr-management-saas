-- Safe additive migration: existing employee and tenant data is preserved.
ALTER TABLE "Employee" ALTER COLUMN "joinDate" DROP NOT NULL;
ALTER TABLE "Employee" ALTER COLUMN "employmentType" DROP NOT NULL;
ALTER TABLE "Employee"
  ADD COLUMN "additionalPhone" TEXT,
  ADD COLUMN "placeOfBirth" TEXT,
  ADD COLUMN "gender" TEXT,
  ADD COLUMN "religion" TEXT,
  ADD COLUMN "maritalStatus" TEXT,
  ADD COLUMN "nationalId" TEXT,
  ADD COLUMN "familyCardNumber" TEXT,
  ADD COLUMN "taxNumber" TEXT,
  ADD COLUMN "contractStartDate" TIMESTAMP(3),
  ADD COLUMN "contractEndDate" TIMESTAMP(3),
  ADD COLUMN "stopDate" TIMESTAMP(3),
  ADD COLUMN "terminationReason" TEXT,
  ADD COLUMN "employeeStatusLabel" TEXT,
  ADD COLUMN "bankName" TEXT,
  ADD COLUMN "bankAccountNumber" TEXT,
  ADD COLUMN "bankAccountHolder" TEXT,
  ADD COLUMN "bpjsHealth" TEXT,
  ADD COLUMN "bpjsEmployment" TEXT,
  ADD COLUMN "importBatchId" TEXT;

CREATE TABLE "MasterData" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "color" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "MasterData_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ImportBatch" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "filename" TEXT NOT NULL,
  "dataType" TEXT NOT NULL DEFAULT 'EMPLOYEE',
  "totalRows" INTEGER NOT NULL,
  "createdRows" INTEGER NOT NULL DEFAULT 0,
  "updatedRows" INTEGER NOT NULL DEFAULT 0,
  "skippedRows" INTEGER NOT NULL DEFAULT 0,
  "warningRows" INTEGER NOT NULL DEFAULT 0,
  "errorRows" INTEGER NOT NULL DEFAULT 0,
  "errorData" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "rolledBackAt" TIMESTAMP(3),
  CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MasterData_companyId_category_code_key" ON "MasterData"("companyId", "category", "code");
CREATE INDEX "MasterData_companyId_category_isActive_deletedAt_idx" ON "MasterData"("companyId", "category", "isActive", "deletedAt");
CREATE INDEX "ImportBatch_companyId_dataType_createdAt_idx" ON "ImportBatch"("companyId", "dataType", "createdAt");
ALTER TABLE "MasterData" ADD CONSTRAINT "MasterData_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
