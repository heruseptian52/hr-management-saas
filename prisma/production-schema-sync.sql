-- Idempotent additive production schema sync. Never drops tables, columns, or existing data.
ALTER TABLE "Employee" ALTER COLUMN "joinDate" DROP NOT NULL;
ALTER TABLE "Employee" ALTER COLUMN "employmentType" DROP NOT NULL;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "additionalPhone" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "placeOfBirth" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "gender" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "religion" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "maritalStatus" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "nationalId" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "familyCardNumber" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "taxNumber" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "contractStartDate" TIMESTAMP(3);
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "contractEndDate" TIMESTAMP(3);
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "stopDate" TIMESTAMP(3);
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "terminationReason" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "employeeStatusLabel" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "bankName" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "bankAccountNumber" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "bankAccountHolder" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "bpjsHealth" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "bpjsEmployment" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "importBatchId" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "contractTypeLabel" TEXT;

CREATE TABLE IF NOT EXISTS "MasterData" (
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

CREATE TABLE IF NOT EXISTS "ImportBatch" (
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

CREATE UNIQUE INDEX IF NOT EXISTS "MasterData_companyId_category_code_key" ON "MasterData"("companyId", "category", "code");
CREATE INDEX IF NOT EXISTS "MasterData_companyId_category_isActive_deletedAt_idx" ON "MasterData"("companyId", "category", "isActive", "deletedAt");
CREATE INDEX IF NOT EXISTS "ImportBatch_companyId_dataType_createdAt_idx" ON "ImportBatch"("companyId", "dataType", "createdAt");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MasterData_companyId_fkey') THEN
    ALTER TABLE "MasterData" ADD CONSTRAINT "MasterData_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ImportBatch_companyId_fkey') THEN
    ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Employee_importBatchId_fkey') THEN
    ALTER TABLE "Employee" ADD CONSTRAINT "Employee_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "Holiday" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'PERUSAHAAN',
  "notes" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Holiday_companyId_date_name_key" ON "Holiday"("companyId","date","name");
CREATE INDEX IF NOT EXISTS "Holiday_companyId_date_isActive_idx" ON "Holiday"("companyId","date","isActive");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Holiday_companyId_fkey') THEN
    ALTER TABLE "Holiday" ADD CONSTRAINT "Holiday_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;


-- Department scheduling rules (additive and tenant isolated).
CREATE TABLE IF NOT EXISTS "DepartmentScheduleRule" (
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
CREATE UNIQUE INDEX IF NOT EXISTS "DepartmentScheduleRule_departmentId_key" ON "DepartmentScheduleRule"("departmentId");
CREATE INDEX IF NOT EXISTS "DepartmentScheduleRule_companyId_idx" ON "DepartmentScheduleRule"("companyId");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DepartmentScheduleRule_companyId_fkey') THEN
    ALTER TABLE "DepartmentScheduleRule" ADD CONSTRAINT "DepartmentScheduleRule_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DepartmentScheduleRule_departmentId_fkey') THEN
    ALTER TABLE "DepartmentScheduleRule" ADD CONSTRAINT "DepartmentScheduleRule_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;


-- Position-level scheduling rules (additive and tenant isolated).
CREATE TABLE IF NOT EXISTS "PositionScheduleRule" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "positionId" TEXT NOT NULL,
  "allowedShiftIds" JSONB NOT NULL DEFAULT '[]',
  "forbiddenOffWeekdays" JSONB NOT NULL DEFAULT '[]',
  "rotation" TEXT NOT NULL DEFAULT 'DAILY',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PositionScheduleRule_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PositionScheduleRule_positionId_key" ON "PositionScheduleRule"("positionId");
CREATE INDEX IF NOT EXISTS "PositionScheduleRule_companyId_idx" ON "PositionScheduleRule"("companyId");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PositionScheduleRule_companyId_fkey') THEN
    ALTER TABLE "PositionScheduleRule" ADD CONSTRAINT "PositionScheduleRule_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PositionScheduleRule_positionId_fkey') THEN
    ALTER TABLE "PositionScheduleRule" ADD CONSTRAINT "PositionScheduleRule_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
