-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_chatUserId_fkey";

-- AlterTable
ALTER TABLE "Ticket" ALTER COLUMN "chatUserId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_chatUserId_fkey" FOREIGN KEY ("chatUserId") REFERENCES "ChatUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
