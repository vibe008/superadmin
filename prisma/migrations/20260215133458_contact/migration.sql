-- CreateTable
CREATE TABLE "ContactSupport" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "attachments" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactSupport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContactSupport_email_idx" ON "ContactSupport"("email");

-- CreateIndex
CREATE INDEX "ContactSupport_status_idx" ON "ContactSupport"("status");

-- CreateIndex
CREATE INDEX "ContactSupport_createdAt_idx" ON "ContactSupport"("createdAt");
