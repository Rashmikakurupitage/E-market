CREATE TYPE "IdentityReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'NOT_REQUIRED');

ALTER TABLE "SellerProfile"
ADD COLUMN "identityReviewStatus" "IdentityReviewStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "identityReviewedAt" TIMESTAMP(3);

UPDATE "SellerProfile"
SET "identityReviewStatus" = 'NOT_REQUIRED';

CREATE TABLE "SellerIdentityDocuments" (
    "sellerId" TEXT NOT NULL,
    "frontImage" BYTEA,
    "frontType" TEXT,
    "backImage" BYTEA,
    "backType" TEXT,
    "selfie" BYTEA,
    "selfieType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SellerIdentityDocuments_pkey" PRIMARY KEY ("sellerId")
);

ALTER TABLE "SellerIdentityDocuments"
ADD CONSTRAINT "SellerIdentityDocuments_sellerId_fkey"
FOREIGN KEY ("sellerId") REFERENCES "SellerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
