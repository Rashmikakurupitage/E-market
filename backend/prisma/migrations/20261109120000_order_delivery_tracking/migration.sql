ALTER TABLE "Order"
ADD COLUMN "trackingCarrier" TEXT,
ADD COLUMN "trackingNumber" TEXT,
ADD COLUMN "trackingUrl" TEXT,
ADD COLUMN "estimatedDeliveryAt" TIMESTAMP(3);
