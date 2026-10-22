CREATE TABLE "LearningCourseMedia" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningCourseMedia_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LearningCourseMedia_courseId_slot_key"
ON "LearningCourseMedia"("courseId", "slot");

ALTER TABLE "LearningCourseMedia"
ADD CONSTRAINT "LearningCourseMedia_courseId_fkey"
FOREIGN KEY ("courseId") REFERENCES "LearningCourse"("courseId")
ON DELETE CASCADE ON UPDATE CASCADE;
