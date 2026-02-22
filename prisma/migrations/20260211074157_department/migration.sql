/*
  Warnings:

  - Made the column `departmentId` on table `Staff` required. This step will fail if there are existing NULL values in that column.
  - Made the column `subDepartmentId` on table `Staff` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Staff" ALTER COLUMN "departmentId" SET NOT NULL,
ALTER COLUMN "subDepartmentId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_subDepartmentId_fkey" FOREIGN KEY ("subDepartmentId") REFERENCES "SubDepartment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
