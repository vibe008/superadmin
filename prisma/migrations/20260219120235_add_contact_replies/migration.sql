-- CreateTable
CREATE TABLE "ContactReply" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "attachments" JSONB,
    "emailSent" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactReply_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContactReply_contactId_idx" ON "ContactReply"("contactId");

-- CreateIndex
CREATE INDEX "ContactReply_staffId_idx" ON "ContactReply"("staffId");

-- CreateIndex
CREATE INDEX "ContactReply_createdAt_idx" ON "ContactReply"("createdAt");

-- AddForeignKey
ALTER TABLE "ContactReply" ADD CONSTRAINT "ContactReply_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "ContactSupport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactReply" ADD CONSTRAINT "ContactReply_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
