-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "assignedToDesignationId" TEXT;

-- CreateIndex
CREATE INDEX "Task_assignedToDesignationId_idx" ON "Task"("assignedToDesignationId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedToDesignationId_fkey" FOREIGN KEY ("assignedToDesignationId") REFERENCES "Designation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
