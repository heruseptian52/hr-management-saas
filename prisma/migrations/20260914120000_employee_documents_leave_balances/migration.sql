CREATE TABLE "LeaveBalance" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "typeName" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "entitledDays" INTEGER NOT NULL DEFAULT 0,
    "carriedDays" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LeaveBalance_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "EmployeeDocument" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileData" BYTEA NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "notes" TEXT,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "EmployeeDocument_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LeaveBalance_companyId_employeeId_typeName_year_key" ON "LeaveBalance"("companyId", "employeeId", "typeName", "year");
CREATE INDEX "LeaveBalance_companyId_year_typeName_idx" ON "LeaveBalance"("companyId", "year", "typeName");
CREATE INDEX "EmployeeDocument_companyId_employeeId_deletedAt_idx" ON "EmployeeDocument"("companyId", "employeeId", "deletedAt");
CREATE INDEX "EmployeeDocument_companyId_expiresAt_deletedAt_idx" ON "EmployeeDocument"("companyId", "expiresAt", "deletedAt");
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
