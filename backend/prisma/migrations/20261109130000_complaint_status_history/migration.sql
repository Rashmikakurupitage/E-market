CREATE TABLE "ComplaintStatusHistory" (
    "id" TEXT NOT NULL,
    "complaintId" TEXT NOT NULL,
    "status" "ComplaintStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplaintStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ComplaintStatusHistory_complaintId_createdAt_idx"
ON "ComplaintStatusHistory"("complaintId", "createdAt");

ALTER TABLE "ComplaintStatusHistory"
ADD CONSTRAINT "ComplaintStatusHistory_complaintId_fkey"
FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "ComplaintStatusHistory" ("id", "complaintId", "status", "createdAt")
SELECT
    'legacy-' || "id",
    "id",
    'OPEN'::"ComplaintStatus",
    "createdAt"
FROM "Complaint";
