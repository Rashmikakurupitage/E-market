ALTER TABLE "CustomerProfile"
ADD COLUMN "cart" JSONB NOT NULL DEFAULT '[]'::jsonb;
