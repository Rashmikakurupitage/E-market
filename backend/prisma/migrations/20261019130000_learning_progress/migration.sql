CREATE TABLE "LearningProgress" (
    "userId" TEXT NOT NULL,
    "progress" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningProgress_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "LearningProgress"
ADD CONSTRAINT "LearningProgress_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
