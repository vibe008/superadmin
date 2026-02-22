/*
  Warnings:

  - A unique constraint covering the columns `[email,type]` on the table `ChatUser` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ChatUser_email_type_key" ON "ChatUser"("email", "type");
