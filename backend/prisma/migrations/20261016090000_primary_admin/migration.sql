-- AlterTable
ALTER TABLE "AdminProfile" ADD COLUMN     "isPrimary" BOOLEAN NOT NULL DEFAULT false;

-- The first admin ever created becomes the primary admin
UPDATE "AdminProfile" SET "isPrimary" = true
WHERE "id" = (SELECT "id" FROM "AdminProfile" ORDER BY "createdAt" ASC, "id" ASC LIMIT 1);
