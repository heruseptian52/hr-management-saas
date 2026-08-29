import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ownerPermissions } from "../src/lib/permissions";

const db = new PrismaClient();
const demoPassword = (() => {
  const value = process.env.SEED_DEMO_PASSWORD;
  if (!value || value.length < 12) throw new Error("SEED_DEMO_PASSWORD must contain at least 12 characters");
  return value;
})();

async function createCompany(code: string, name: string, ownerEmail: string, employeePrefix: string) {
  const company = await db.company.upsert({ where: { code }, update: {}, create: { code, name, email: ownerEmail } });
  const role = await db.role.upsert({
    where: { companyId_name: { companyId: company.id, name: "Owner" } },
    update: { permissions: ownerPermissions },
    create: { companyId: company.id, name: "Owner", isSystem: true, permissions: ownerPermissions },
  });
  const passwordHash = await bcrypt.hash(demoPassword, 12);
  const user = await db.user.upsert({ where: { email: ownerEmail }, update: { passwordHash }, create: { email: ownerEmail, fullName: `Owner ${name}`, passwordHash } });
  await db.membership.upsert({ where: { userId_companyId: { userId: user.id, companyId: company.id } }, update: { roleId: role.id }, create: { userId: user.id, companyId: company.id, roleId: role.id } });
  const branch = await db.branch.upsert({ where: { companyId_code: { companyId: company.id, code: "HQ" } }, update: {}, create: { companyId: company.id, code: "HQ", name: "Kantor Pusat" } });
  const department = await db.department.upsert({ where: { companyId_code: { companyId: company.id, code: "OPS" } }, update: {}, create: { companyId: company.id, code: "OPS", name: "Operasional" } });
  const position = await db.position.upsert({ where: { companyId_code: { companyId: company.id, code: "STAFF" } }, update: {}, create: { companyId: company.id, code: "STAFF", name: "Staff" } });
  for (let index = 1; index <= 10; index++) {
    const employeeNumber = `${employeePrefix}${String(index).padStart(3, "0")}`;
    await db.employee.upsert({
      where: { companyId_employeeNumber: { companyId: company.id, employeeNumber } }, update: {},
      create: { companyId: company.id, employeeNumber, fullName: `Karyawan ${name} ${index}`, email: `${employeePrefix.toLowerCase()}${index}@demo.test`, joinDate: new Date("2026-01-01"), branchId: branch.id, departmentId: department.id, positionId: position.id, employmentType: index % 3 === 0 ? "CONTRACT" : "PERMANENT", monthlyDaysOff: index % 2 === 0 ? 4 : 2 },
    });
  }
}

async function main() {
  await createCompany("NUSANTARA", "PT Nusantara Jaya", "owner@nusantara.demo", "NJA");
  await createCompany("BORNEO", "CV Borneo Sejahtera", "owner@borneo.demo", "BRS");
  const passwordHash = await bcrypt.hash(demoPassword, 12);
  await db.user.upsert({ where: { email: "superadmin@hr.demo" }, update: { passwordHash }, create: { email: "superadmin@hr.demo", fullName: "Super Admin", passwordHash, platformRole: "SUPER_ADMIN" } });
}

main().finally(() => db.$disconnect());
