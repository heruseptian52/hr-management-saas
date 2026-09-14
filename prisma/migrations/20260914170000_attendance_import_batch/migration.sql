ALTER TABLE "Attendance" ADD COLUMN "importBatchId" TEXT;
CREATE INDEX "Attendance_companyId_importBatchId_idx" ON "Attendance"("companyId", "importBatchId");
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
