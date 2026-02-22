-- AlterTable
ALTER TABLE "ContactSupport" ADD COLUMN     "lockExpiresAt" TIMESTAMP(3),
ADD COLUMN     "lockedAt" TIMESTAMP(3),
ADD COLUMN     "lockedById" TEXT;

-- CreateIndex
CREATE INDEX "ContactSupport_lockExpiresAt_idx" ON "ContactSupport"("lockExpiresAt");

-- AddForeignKey
ALTER TABLE "ContactSupport" ADD CONSTRAINT "ContactSupport_lockedById_fkey" FOREIGN KEY ("lockedById") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
