ALTER TABLE "SellerProfile"
ADD COLUMN "nicFront" TEXT,
ADD COLUMN "nicBack" TEXT;

CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
