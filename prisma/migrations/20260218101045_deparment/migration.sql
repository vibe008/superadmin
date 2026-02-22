/*
  Warnings:

  - You are about to drop the column `designation` on the `Staff` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name,departmentId]` on the table `SubDepartment` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "SubDepartment" DROP CONSTRAINT "SubDepartment_departmentId_fkey";

-- DropIndex
DROP INDEX "SubDepartment_name_key";

-- AlterTable
ALTER TABLE "Staff" DROP COLUMN "designation",
ADD COLUMN     "designationId" TEXT;

-- CreateTable
CREATE TABLE "Designation" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subDepartmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Designation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Designation_title_subDepartmentId_key" ON "Designation"("title", "subDepartmentId");

-- CreateIndex
CREATE UNIQUE INDEX "SubDepartment_name_departmentId_key" ON "SubDepartment"("name", "departmentId");

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_designationId_fkey" FOREIGN KEY ("designationId") REFERENCES "Designation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubDepartment" ADD CONSTRAINT "SubDepartment_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Designation" ADD CONSTRAINT "Designation_subDepartmentId_fkey" FOREIGN KEY ("subDepartmentId") REFERENCES "SubDepartment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
