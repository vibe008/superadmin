-- AlterTable
ALTER TABLE "Staff" ADD COLUMN     "movedToPastAt" TIMESTAMP(3),
ADD COLUMN     "registrationType" TEXT NOT NULL DEFAULT 'NEW';
