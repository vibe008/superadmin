/*
  Warnings:

  - A unique constraint covering the columns `[email,code]` on the table `ChatUser` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "ChatUser_email_type_key";

-- CreateIndex
CREATE UNIQUE INDEX "ChatUser_email_code_key" ON "ChatUser"("email", "code");
