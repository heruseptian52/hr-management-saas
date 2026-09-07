import { db } from "@/lib/db";

let ready = false;

export async function ensureEmployeeImportSchema() {
  if (ready) return;

  await db.$executeRawUnsafe(`
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
    )
  `);
  await db.$executeRawUnsafe(`
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
    )
  `);
  await db.$executeRawUnsafe('ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "importBatchId" TEXT');
  await db.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "MasterData_companyId_category_code_key" ON "MasterData"("companyId", "category", "code")');
  await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "MasterData_companyId_category_isActive_deletedAt_idx" ON "MasterData"("companyId", "category", "isActive", "deletedAt")');
  await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "ImportBatch_companyId_dataType_createdAt_idx" ON "ImportBatch"("companyId", "dataType", "createdAt")');
  await db.$executeRawUnsafe(`
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
    END $$
  `);

  ready = true;
}
