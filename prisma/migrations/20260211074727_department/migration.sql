/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Staff` table. All the data in the column will be lost.
  - You are about to drop the column `mobile` on the `Staff` table. All the data in the column will be lost.
  - The `permissions` column on the `Staff` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `role` to the `Staff` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Staff" DROP CONSTRAINT "Staff_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "Staff" DROP CONSTRAINT "Staff_subDepartmentId_fkey";

-- AlterTable
ALTER TABLE "Staff" DROP COLUMN "createdAt",
DROP COLUMN "mobile",
DROP COLUMN "role",
ADD COLUMN     "role" TEXT NOT NULL,
DROP COLUMN "permissions",
ADD COLUMN     "permissions" TEXT[],
ALTER COLUMN "departmentId" DROP NOT NULL,
ALTER COLUMN "subDepartmentId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_subDepartmentId_fkey" FOREIGN KEY ("subDepartmentId") REFERENCES "SubDepartment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
