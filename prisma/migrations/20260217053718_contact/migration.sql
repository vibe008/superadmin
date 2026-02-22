-- CreateEnum
CREATE TYPE "TicketSource" AS ENUM ('CHAT', 'CONTACT');

-- AlterTable
ALTER TABLE "ContactSupport" ADD COLUMN     "convertedAt" TIMESTAMP(3),
ADD COLUMN     "convertedById" TEXT;

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "source" "TicketSource" NOT NULL DEFAULT 'CHAT',
ADD COLUMN     "sourceContactId" TEXT;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_sourceContactId_fkey" FOREIGN KEY ("sourceContactId") REFERENCES "ContactSupport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactSupport" ADD CONSTRAINT "ContactSupport_convertedById_fkey" FOREIGN KEY ("convertedById") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
