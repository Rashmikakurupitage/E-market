ALTER TABLE "SellerProfile" ADD COLUMN "businessType" TEXT;

UPDATE "SellerProfile" AS seller
SET "businessType" = COALESCE(
  (
    SELECT product."category"
    FROM "Product" AS product
    WHERE product."sellerId" = seller."id"
    GROUP BY product."category"
    ORDER BY COUNT(*) DESC, product."category" ASC
    LIMIT 1
  ),
  'Other'
);

ALTER TABLE "SellerProfile" ALTER COLUMN "businessType" SET DEFAULT 'Other';
ALTER TABLE "SellerProfile" ALTER COLUMN "businessType" SET NOT NULL;
