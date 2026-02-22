-- CreateEnum
CREATE TYPE "TaskSource" AS ENUM ('INTERNAL', 'TICKET');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "source" "TaskSource" NOT NULL DEFAULT 'INTERNAL';

-- CreateIndex
CREATE INDEX "Task_source_idx" ON "Task"("source");
