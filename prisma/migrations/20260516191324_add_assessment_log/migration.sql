-- AlterTable
ALTER TABLE "_UserToUserGroup" ADD CONSTRAINT "_UserToUserGroup_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_UserToUserGroup_AB_unique";

-- CreateTable
CREATE TABLE "AssessmentLog" (
    "id" TEXT NOT NULL,
    "assessmentPlan" TEXT NOT NULL,
    "courseName" TEXT NOT NULL,
    "studentGroup" TEXT NOT NULL,
    "submittedCount" INTEGER NOT NULL,
    "operationType" TEXT NOT NULL,
    "performedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssessmentLog_pkey" PRIMARY KEY ("id")
);