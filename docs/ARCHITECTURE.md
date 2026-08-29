# Architecture

## Non-negotiable tenant isolation
Every tenant-owned table contains `companyId`. Every query, mutation, export and report must derive the company from authenticated server-side context and scope by that ID. Client-supplied company IDs must never grant access.

## Roles
Platform: SUPER_ADMIN, USER. Company: OWNER, ADMIN, HR, MANAGER, SUPERVISOR, EMPLOYEE.

## Planned modules
P1 foundation/auth/tenant; P2 employees/branches; P3 shifts/scheduling; P4 attendance GPS/QR; P5 reports/export/print; then leave, payroll-ready records, contracts, audit logs, notifications and integrations.

## Localization
All user-facing strings and generated reports will support Indonesian and English, with company timezone/currency/date format preferences.
