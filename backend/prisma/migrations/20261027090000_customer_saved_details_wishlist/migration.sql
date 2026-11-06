ALTER TABLE "CustomerProfile"
ADD COLUMN "savedDeliveryName" TEXT,
ADD COLUMN "savedDeliveryPhone" TEXT,
ADD COLUMN "savedDeliveryAddress" TEXT,
ADD COLUMN "savedDeliveryDistrict" TEXT;

CREATE TABLE "WishlistItem" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WishlistItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WishlistItem_customerId_productId_key"
ON "WishlistItem"("customerId", "productId");

CREATE INDEX "WishlistItem_customerId_createdAt_idx"
ON "WishlistItem"("customerId", "createdAt");

ALTER TABLE "WishlistItem"
ADD CONSTRAINT "WishlistItem_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "CustomerProfile"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WishlistItem"
ADD CONSTRAINT "WishlistItem_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
