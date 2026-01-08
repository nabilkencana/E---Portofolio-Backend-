/*
  Warnings:

  - A unique constraint covering the columns `[npsn]` on the table `schools` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "schools" ADD COLUMN     "accreditation" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "npsn" TEXT,
ADD COLUMN     "schoolLevel" TEXT,
ADD COLUMN     "subdistrict" TEXT,
ADD COLUMN     "village" TEXT,
ADD COLUMN     "website" TEXT,
ALTER COLUMN "schoolCode" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "schools_npsn_key" ON "schools"("npsn");
