CREATE TABLE "LearningCourse" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningCourse_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LearningCourse_courseId_key" ON "LearningCourse"("courseId");
