-- AlterTable
ALTER TABLE "SellerProfile" ADD COLUMN     "nicEncrypted" TEXT,
ADD COLUMN     "nicHash" TEXT,
ADD COLUMN     "nicLast5" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "SellerProfile_nicHash_key" ON "SellerProfile"("nicHash");
