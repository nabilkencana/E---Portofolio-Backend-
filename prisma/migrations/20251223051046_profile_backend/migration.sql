/*
  Warnings:

  - You are about to drop the column `institution` on the `profiles` table. All the data in the column will be lost.
  - You are about to drop the column `position` on the `profiles` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[nip]` on the table `profiles` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "educations" ALTER COLUMN "field" DROP NOT NULL;

-- AlterTable
ALTER TABLE "profiles" DROP COLUMN "institution",
DROP COLUMN "position",
ADD COLUMN     "email" TEXT,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "schoolId" TEXT;

-- CreateTable
CREATE TABLE "schools" (
    "id" TEXT NOT NULL,
    "schoolCode" TEXT NOT NULL,
    "schoolName" TEXT NOT NULL,
    "schoolType" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "province" TEXT,
    "postalCode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_details" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subjectTaught" TEXT,
    "competencies" TEXT,
    "educationLevel" TEXT,
    "yearsOfExperience" INTEGER,
    "teachingCertificate" TEXT,
    "certificationNumber" TEXT,
    "specialization" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teacher_details_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "schools_schoolCode_key" ON "schools"("schoolCode");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_details_userId_key" ON "teacher_details"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_nip_key" ON "profiles"("nip");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_details" ADD CONSTRAINT "teacher_details_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
