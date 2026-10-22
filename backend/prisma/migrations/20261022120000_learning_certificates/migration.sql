CREATE TABLE "LearningCertificate" (
    "id" TEXT NOT NULL,
    "certificateCode" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "courseTitle" TEXT NOT NULL,
    "learnerName" TEXT NOT NULL,
    "lessonCount" INTEGER NOT NULL,
    "quizScore" INTEGER NOT NULL,
    "quizQuestionCount" INTEGER NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningCertificate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LearningCertificate_certificateCode_key"
ON "LearningCertificate"("certificateCode");

CREATE UNIQUE INDEX "LearningCertificate_userId_courseId_key"
ON "LearningCertificate"("userId", "courseId");

ALTER TABLE "LearningCertificate"
ADD CONSTRAINT "LearningCertificate_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
