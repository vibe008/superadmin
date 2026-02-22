/*
  Warnings:

  - The values [ADMIN,PRODUCTION,TECH_IT,SALES_MARKETING,FINANCE,INVENTORY] on the enum `RoleEnum` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "RoleEnum_new" AS ENUM ('SUPERADMIN', 'SUPPORT', 'TASK_ASSIGNER', 'DEVELOPER');
ALTER TABLE "Staff" ALTER COLUMN "role" TYPE "RoleEnum_new" USING ("role"::text::"RoleEnum_new");
ALTER TYPE "RoleEnum" RENAME TO "RoleEnum_old";
ALTER TYPE "RoleEnum_new" RENAME TO "RoleEnum";
DROP TYPE "public"."RoleEnum_old";
COMMIT;
