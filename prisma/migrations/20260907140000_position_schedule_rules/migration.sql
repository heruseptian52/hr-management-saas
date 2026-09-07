CREATE TABLE "PositionScheduleRule" (
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
CREATE UNIQUE INDEX "PositionScheduleRule_positionId_key" ON "PositionScheduleRule"("positionId");
CREATE INDEX "PositionScheduleRule_companyId_idx" ON "PositionScheduleRule"("companyId");
ALTER TABLE "PositionScheduleRule" ADD CONSTRAINT "PositionScheduleRule_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PositionScheduleRule" ADD CONSTRAINT "PositionScheduleRule_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE CASCADE ON UPDATE CASCADE;
