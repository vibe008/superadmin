-- CreateEnum
CREATE TYPE "RoleEnum" AS ENUM ('SUPERADMIN', 'SUPPORT_AGENT', 'TASK_ASSIGNER');

-- CreateEnum
CREATE TYPE "PermissionEnum" AS ENUM ('VIEW_TICKETS', 'CREATE_TICKETS', 'UPDATE_TICKETS', 'VIEW_CHAT', 'RESPOND_CHAT', 'VIEW_TASKS', 'CREATE_TASKS', 'ASSIGN_TASKS', 'MANAGE_USERS', 'VIEW_REPORTS');

-- CreateTable
CREATE TABLE "Staff" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mobile" TEXT,
    "password" TEXT NOT NULL,
    "role" "RoleEnum",
    "permissions" "PermissionEnum"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Staff_email_key" ON "Staff"("email");
