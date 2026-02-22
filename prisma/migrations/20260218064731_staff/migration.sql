/*
  Warnings:

  - The `role` column on the `Staff` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "AddressType" AS ENUM ('CURRENT', 'PERMANENT');

-- AlterTable
ALTER TABLE "Staff" ADD COLUMN     "adharNumber" TEXT,
ADD COLUMN     "bloodGroup" TEXT,
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "designation" TEXT,
ADD COLUMN     "fatherName" TEXT,
ADD COLUMN     "formNumber" TEXT,
ADD COLUMN     "haveVehicle" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "healthIssue" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "healthIssueDescription" TEXT,
ADD COLUMN     "maritalStatus" TEXT,
ADD COLUMN     "mobileNumber" TEXT,
ADD COLUMN     "motherName" TEXT,
ADD COLUMN     "registrationDate" TIMESTAMP(3),
ADD COLUMN     "vehicleNumber" TEXT,
ALTER COLUMN "password" DROP NOT NULL,
DROP COLUMN "role",
ADD COLUMN     "role" "RoleEnum";

-- CreateTable
CREATE TABLE "StaffAddress" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "type" "AddressType" NOT NULL,
    "pincode" TEXT,
    "country" TEXT,
    "state" TEXT,
    "district" TEXT,
    "fullAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkExperience" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactNumber" TEXT,
    "designation" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkExperience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankDetail" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "bankName" TEXT,
    "accountHolderName" TEXT,
    "accountNumber" TEXT,
    "ifscCode" TEXT,

    CONSTRAINT "BankDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffDocument" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "adharFront" TEXT,
    "adharBack" TEXT,
    "signature" TEXT,
    "photo" TEXT,
    "experienceLetter" TEXT,
    "bankStatement" TEXT,
    "otherDocuments" TEXT,

    CONSTRAINT "StaffDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BankDetail_staffId_key" ON "BankDetail"("staffId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffDocument_staffId_key" ON "StaffDocument"("staffId");

-- AddForeignKey
ALTER TABLE "StaffAddress" ADD CONSTRAINT "StaffAddress_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkExperience" ADD CONSTRAINT "WorkExperience_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankDetail" ADD CONSTRAINT "BankDetail_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffDocument" ADD CONSTRAINT "StaffDocument_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
