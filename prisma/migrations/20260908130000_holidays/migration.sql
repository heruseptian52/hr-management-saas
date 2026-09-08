CREATE TABLE IF NOT EXISTS "Holiday" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "date" TIMESTAMP(3) NOT NULL,
  "name" TEXT NOT NULL, "type" TEXT NOT NULL DEFAULT 'PERUSAHAAN', "notes" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Holiday_companyId_date_name_key" ON "Holiday"("companyId","date","name");
CREATE INDEX IF NOT EXISTS "Holiday_companyId_date_isActive_idx" ON "Holiday"("companyId","date","isActive");
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Holiday_companyId_fkey') THEN ALTER TABLE "Holiday" ADD CONSTRAINT "Holiday_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;
