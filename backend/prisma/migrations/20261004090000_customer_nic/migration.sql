-- AlterTable
ALTER TABLE "CustomerProfile" ADD COLUMN     "nicNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CustomerProfile_nicNumber_key" ON "CustomerProfile"("nicNumber");

