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
CREATE TABLE IF NOT EXISTS "LeaveRequest" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "typeName" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "totalDays" INTEGER NOT NULL,
  "reason" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "reviewedById" TEXT,
  "reviewNotes" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "LeaveRequest_companyId_status_startDate_idx" ON "LeaveRequest"("companyId", "status", "startDate");
CREATE INDEX IF NOT EXISTS "LeaveRequest_companyId_employeeId_startDate_idx" ON "LeaveRequest"("companyId", "employeeId", "startDate");
DO $$ BEGIN ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE IF NOT EXISTS "OvertimeRequest" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "employeeId" TEXT NOT NULL,
  "typeName" TEXT NOT NULL, "workDate" TIMESTAMP(3) NOT NULL, "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL, "totalMinutes" INTEGER NOT NULL, "reason" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING', "reviewedById" TEXT, "reviewNotes" TEXT,
  "reviewedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OvertimeRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "OvertimeRequest_companyId_status_workDate_idx" ON "OvertimeRequest"("companyId", "status", "workDate");
CREATE INDEX IF NOT EXISTS "OvertimeRequest_companyId_employeeId_workDate_idx" ON "OvertimeRequest"("companyId", "employeeId", "workDate");
DO $$ BEGIN ALTER TABLE "OvertimeRequest" ADD CONSTRAINT "OvertimeRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "OvertimeRequest" ADD CONSTRAINT "OvertimeRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE IF NOT EXISTS "PayrollPeriod" ("id" TEXT NOT NULL,"companyId" TEXT NOT NULL,"name" TEXT NOT NULL,"year" INTEGER NOT NULL,"month" INTEGER NOT NULL,"status" TEXT NOT NULL DEFAULT 'DRAFT',"paymentDate" TIMESTAMP(3),"finalizedAt" TIMESTAMP(3),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "PayrollPeriod_pkey" PRIMARY KEY ("id"));
CREATE TABLE IF NOT EXISTS "PayrollItem" ("id" TEXT NOT NULL,"companyId" TEXT NOT NULL,"payrollPeriodId" TEXT NOT NULL,"employeeId" TEXT NOT NULL,"baseSalary" DECIMAL(18,2) NOT NULL DEFAULT 0,"allowance" DECIMAL(18,2) NOT NULL DEFAULT 0,"overtimePay" DECIMAL(18,2) NOT NULL DEFAULT 0,"bonus" DECIMAL(18,2) NOT NULL DEFAULT 0,"deduction" DECIMAL(18,2) NOT NULL DEFAULT 0,"netSalary" DECIMAL(18,2) NOT NULL DEFAULT 0,"notes" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "PayrollItem_pkey" PRIMARY KEY ("id"));
ALTER TABLE "PayrollItem" ADD COLUMN IF NOT EXISTS "earningDetails" JSONB;
ALTER TABLE "PayrollItem" ADD COLUMN IF NOT EXISTS "deductionDetails" JSONB;
CREATE UNIQUE INDEX IF NOT EXISTS "PayrollPeriod_companyId_year_month_key" ON "PayrollPeriod"("companyId","year","month");
CREATE INDEX IF NOT EXISTS "PayrollPeriod_companyId_status_year_month_idx" ON "PayrollPeriod"("companyId","status","year","month");
CREATE UNIQUE INDEX IF NOT EXISTS "PayrollItem_payrollPeriodId_employeeId_key" ON "PayrollItem"("payrollPeriodId","employeeId");
CREATE INDEX IF NOT EXISTS "PayrollItem_companyId_employeeId_payrollPeriodId_idx" ON "PayrollItem"("companyId","employeeId","payrollPeriodId");
DO $$ BEGIN ALTER TABLE "PayrollPeriod" ADD CONSTRAINT "PayrollPeriod_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_payrollPeriodId_fkey" FOREIGN KEY ("payrollPeriodId") REFERENCES "PayrollPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE IF NOT EXISTS "KpiReview" ("id" TEXT NOT NULL,"companyId" TEXT NOT NULL,"employeeId" TEXT NOT NULL,"periodLabel" TEXT NOT NULL,"reviewDate" TIMESTAMP(3) NOT NULL,"score" INTEGER NOT NULL,"target" TEXT,"achievement" TEXT,"notes" TEXT,"status" TEXT NOT NULL DEFAULT 'DRAFT',"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "KpiReview_pkey" PRIMARY KEY ("id"));
CREATE TABLE IF NOT EXISTS "Asset" ("id" TEXT NOT NULL,"companyId" TEXT NOT NULL,"code" TEXT NOT NULL,"name" TEXT NOT NULL,"category" TEXT NOT NULL,"serialNumber" TEXT,"employeeId" TEXT,"assignedAt" TIMESTAMP(3),"returnedAt" TIMESTAMP(3),"condition" TEXT NOT NULL DEFAULT 'BAIK',"status" TEXT NOT NULL DEFAULT 'AVAILABLE',"notes" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"deletedAt" TIMESTAMP(3),CONSTRAINT "Asset_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX IF NOT EXISTS "KpiReview_companyId_employeeId_periodLabel_key" ON "KpiReview"("companyId","employeeId","periodLabel");
CREATE INDEX IF NOT EXISTS "KpiReview_companyId_reviewDate_status_idx" ON "KpiReview"("companyId","reviewDate","status");
CREATE UNIQUE INDEX IF NOT EXISTS "Asset_companyId_code_key" ON "Asset"("companyId","code");
CREATE INDEX IF NOT EXISTS "Asset_companyId_status_employeeId_deletedAt_idx" ON "Asset"("companyId","status","employeeId","deletedAt");
DO $$ BEGIN ALTER TABLE "KpiReview" ADD CONSTRAINT "KpiReview_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "KpiReview" ADD CONSTRAINT "KpiReview_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Asset" ADD CONSTRAINT "Asset_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Asset" ADD CONSTRAINT "Asset_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE IF NOT EXISTS "Announcement" ("id" TEXT NOT NULL,"companyId" TEXT NOT NULL,"title" TEXT NOT NULL,"content" TEXT NOT NULL,"priority" TEXT NOT NULL DEFAULT 'NORMAL',"status" TEXT NOT NULL DEFAULT 'DRAFT',"publishedAt" TIMESTAMP(3),"expiresAt" TIMESTAMP(3),"createdById" TEXT NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id"));
CREATE TABLE IF NOT EXISTS "Notification" ("id" TEXT NOT NULL,"companyId" TEXT NOT NULL,"userId" TEXT NOT NULL,"title" TEXT NOT NULL,"message" TEXT NOT NULL,"type" TEXT NOT NULL DEFAULT 'INFO',"link" TEXT,"readAt" TIMESTAMP(3),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "Notification_pkey" PRIMARY KEY ("id"));
CREATE INDEX IF NOT EXISTS "Announcement_companyId_status_publishedAt_idx" ON "Announcement"("companyId","status","publishedAt");
CREATE INDEX IF NOT EXISTS "Notification_companyId_userId_readAt_createdAt_idx" ON "Notification"("companyId","userId","readAt","createdAt");
DO $$ BEGIN ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Notification" ADD CONSTRAINT "Notification_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tables added after the original production bootstrap. All statements are
-- additive and idempotent so Railway can safely run this file on every deploy.
CREATE TABLE IF NOT EXISTS "LeaveBalance" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "employeeId" TEXT NOT NULL,
  "typeName" TEXT NOT NULL, "year" INTEGER NOT NULL,
  "entitledDays" INTEGER NOT NULL DEFAULT 0, "carriedDays" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "LeaveBalance_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "EmployeeDocument" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "employeeId" TEXT NOT NULL,
  "category" TEXT NOT NULL, "title" TEXT NOT NULL, "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL, "fileSize" INTEGER NOT NULL, "fileData" BYTEA NOT NULL,
  "expiresAt" TIMESTAMP(3), "notes" TEXT, "uploadedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, "deletedAt" TIMESTAMP(3),
  CONSTRAINT "EmployeeDocument_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "LeaveBalance_companyId_employeeId_typeName_year_key" ON "LeaveBalance"("companyId", "employeeId", "typeName", "year");
CREATE INDEX IF NOT EXISTS "LeaveBalance_companyId_year_typeName_idx" ON "LeaveBalance"("companyId", "year", "typeName");
CREATE INDEX IF NOT EXISTS "EmployeeDocument_companyId_employeeId_deletedAt_idx" ON "EmployeeDocument"("companyId", "employeeId", "deletedAt");
CREATE INDEX IF NOT EXISTS "EmployeeDocument_companyId_expiresAt_deletedAt_idx" ON "EmployeeDocument"("companyId", "expiresAt", "deletedAt");
DO $$ BEGIN ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "importBatchId" TEXT;
CREATE INDEX IF NOT EXISTS "Attendance_companyId_importBatchId_idx" ON "Attendance"("companyId", "importBatchId");
DO $$ BEGIN ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "JobVacancy" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "code" TEXT NOT NULL,
  "title" TEXT NOT NULL, "departmentId" TEXT, "positionId" TEXT,
  "openings" INTEGER NOT NULL DEFAULT 1, "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT', "deadline" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, "deletedAt" TIMESTAMP(3),
  CONSTRAINT "JobVacancy_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "Candidate" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "vacancyId" TEXT,
  "fullName" TEXT NOT NULL, "email" TEXT, "phone" TEXT, "nationalId" TEXT,
  "birthDate" TIMESTAMP(3), "address" TEXT, "source" TEXT,
  "stage" TEXT NOT NULL DEFAULT 'APPLIED', "notes" TEXT, "employeeId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, "deletedAt" TIMESTAMP(3),
  CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "CandidateDocument" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "candidateId" TEXT NOT NULL,
  "title" TEXT NOT NULL, "fileName" TEXT NOT NULL, "mimeType" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL, "fileData" BYTEA NOT NULL, "uploadedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "deletedAt" TIMESTAMP(3),
  CONSTRAINT "CandidateDocument_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "OnboardingTask" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "candidateId" TEXT NOT NULL,
  "employeeId" TEXT, "title" TEXT NOT NULL, "dueDate" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'PENDING', "notes" TEXT,
  "completedAt" TIMESTAMP(3), "completedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, "deletedAt" TIMESTAMP(3),
  CONSTRAINT "OnboardingTask_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "JobVacancy_companyId_code_key" ON "JobVacancy"("companyId", "code");
CREATE INDEX IF NOT EXISTS "JobVacancy_companyId_status_deletedAt_idx" ON "JobVacancy"("companyId", "status", "deletedAt");
CREATE UNIQUE INDEX IF NOT EXISTS "Candidate_employeeId_key" ON "Candidate"("employeeId");
CREATE INDEX IF NOT EXISTS "Candidate_companyId_stage_deletedAt_idx" ON "Candidate"("companyId", "stage", "deletedAt");
CREATE INDEX IF NOT EXISTS "Candidate_companyId_vacancyId_deletedAt_idx" ON "Candidate"("companyId", "vacancyId", "deletedAt");
CREATE INDEX IF NOT EXISTS "CandidateDocument_companyId_candidateId_deletedAt_idx" ON "CandidateDocument"("companyId", "candidateId", "deletedAt");
CREATE INDEX IF NOT EXISTS "OnboardingTask_companyId_candidateId_status_deletedAt_idx" ON "OnboardingTask"("companyId", "candidateId", "status", "deletedAt");
CREATE INDEX IF NOT EXISTS "OnboardingTask_companyId_employeeId_status_deletedAt_idx" ON "OnboardingTask"("companyId", "employeeId", "status", "deletedAt");
DO $$ BEGIN ALTER TABLE "JobVacancy" ADD CONSTRAINT "JobVacancy_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "JobVacancy"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "CandidateDocument" ADD CONSTRAINT "CandidateDocument_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "CandidateDocument" ADD CONSTRAINT "CandidateDocument_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "OnboardingTask" ADD CONSTRAINT "OnboardingTask_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "OnboardingTask" ADD CONSTRAINT "OnboardingTask_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "OnboardingTask" ADD CONSTRAINT "OnboardingTask_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "TrainingProgram" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "code" TEXT NOT NULL,
  "name" TEXT NOT NULL, "category" TEXT, "provider" TEXT, "location" TEXT,
  "startDate" TIMESTAMP(3) NOT NULL, "endDate" TIMESTAMP(3) NOT NULL,
  "capacity" INTEGER, "cost" DECIMAL(18,2), "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "description" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, "deletedAt" TIMESTAMP(3),
  CONSTRAINT "TrainingProgram_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "TrainingParticipant" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL,
  "trainingProgramId" TEXT NOT NULL, "employeeId" TEXT NOT NULL,
  "attendanceStatus" TEXT NOT NULL DEFAULT 'REGISTERED',
  "completionStatus" TEXT NOT NULL DEFAULT 'PENDING', "score" INTEGER,
  "certificateNumber" TEXT, "certificateUrl" TEXT, "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, "deletedAt" TIMESTAMP(3),
  CONSTRAINT "TrainingParticipant_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TrainingProgram_companyId_code_key" ON "TrainingProgram"("companyId", "code");
CREATE INDEX IF NOT EXISTS "TrainingProgram_companyId_status_startDate_deletedAt_idx" ON "TrainingProgram"("companyId", "status", "startDate", "deletedAt");
CREATE UNIQUE INDEX IF NOT EXISTS "TrainingParticipant_trainingProgramId_employeeId_key" ON "TrainingParticipant"("trainingProgramId", "employeeId");
CREATE INDEX IF NOT EXISTS "TrainingParticipant_companyId_employeeId_completionStatus_deletedAt_idx" ON "TrainingParticipant"("companyId", "employeeId", "completionStatus", "deletedAt");
DO $$ BEGIN ALTER TABLE "TrainingProgram" ADD CONSTRAINT "TrainingProgram_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "TrainingParticipant" ADD CONSTRAINT "TrainingParticipant_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "TrainingParticipant" ADD CONSTRAINT "TrainingParticipant_trainingProgramId_fkey" FOREIGN KEY ("trainingProgramId") REFERENCES "TrainingProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "TrainingParticipant" ADD CONSTRAINT "TrainingParticipant_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "DisciplinaryCase" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "employeeId" TEXT NOT NULL,
  "caseNumber" TEXT NOT NULL, "incidentDate" TIMESTAMP(3) NOT NULL,
  "category" TEXT NOT NULL, "severity" TEXT NOT NULL DEFAULT 'WARNING',
  "title" TEXT NOT NULL, "description" TEXT NOT NULL, "actionTaken" TEXT,
  "status" TEXT NOT NULL DEFAULT 'OPEN', "validUntil" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3), "resolution" TEXT, "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, "deletedAt" TIMESTAMP(3),
  CONSTRAINT "DisciplinaryCase_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "DisciplinaryDocument" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "disciplinaryCaseId" TEXT NOT NULL,
  "title" TEXT NOT NULL, "fileName" TEXT NOT NULL, "mimeType" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL, "fileData" BYTEA NOT NULL, "uploadedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "deletedAt" TIMESTAMP(3),
  CONSTRAINT "DisciplinaryDocument_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "DisciplinaryCase_companyId_caseNumber_key" ON "DisciplinaryCase"("companyId", "caseNumber");
CREATE INDEX IF NOT EXISTS "DisciplinaryCase_companyId_employeeId_status_incidentDate_deletedAt_idx" ON "DisciplinaryCase"("companyId", "employeeId", "status", "incidentDate", "deletedAt");
CREATE INDEX IF NOT EXISTS "DisciplinaryDocument_companyId_disciplinaryCaseId_deletedAt_idx" ON "DisciplinaryDocument"("companyId", "disciplinaryCaseId", "deletedAt");
DO $$ BEGIN ALTER TABLE "DisciplinaryCase" ADD CONSTRAINT "DisciplinaryCase_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "DisciplinaryCase" ADD CONSTRAINT "DisciplinaryCase_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "DisciplinaryDocument" ADD CONSTRAINT "DisciplinaryDocument_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "DisciplinaryDocument" ADD CONSTRAINT "DisciplinaryDocument_disciplinaryCaseId_fkey" FOREIGN KEY ("disciplinaryCaseId") REFERENCES "DisciplinaryCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

UPDATE "Role"
SET "permissions" = COALESCE("permissions", '{}'::jsonb)
  || '{"recruitment":["view","create","edit","delete","approve","export"],"training":["view","create","edit","delete","approve","export"],"discipline":["view","create","edit","delete","approve","export"]}'::jsonb
WHERE "isSystem" = TRUE AND LOWER("name") = 'owner';
