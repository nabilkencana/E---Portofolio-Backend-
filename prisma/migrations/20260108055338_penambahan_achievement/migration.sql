/*
  Warnings:

  - You are about to drop the column `expiryDate` on the `achievements` table. All the data in the column will be lost.
  - You are about to drop the column `issueDate` on the `achievements` table. All the data in the column will be lost.
  - You are about to drop the column `issuedBy` on the `achievements` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `achievements` table. All the data in the column will be lost.
  - You are about to drop the column `score` on the `achievements` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `achievements` table. All the data in the column will be lost.
  - You are about to drop the `achievement_attachments` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "achievement_attachments" DROP CONSTRAINT "achievement_attachments_achievementId_fkey";

-- AlterTable
ALTER TABLE "achievements" DROP COLUMN "expiryDate",
DROP COLUMN "issueDate",
DROP COLUMN "issuedBy",
DROP COLUMN "notes",
DROP COLUMN "score",
DROP COLUMN "status",
ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "fileType" TEXT,
ADD COLUMN     "level" TEXT,
ADD COLUMN     "originalFileName" TEXT,
ADD COLUMN     "proofFilePath" TEXT,
ADD COLUMN     "proofPublicId" TEXT,
ADD COLUMN     "rejectionNotes" TEXT,
ADD COLUMN     "validationStatus" "Status" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "year" INTEGER,
ALTER COLUMN "type" SET DEFAULT 'prestasi';

-- DropTable
DROP TABLE "achievement_attachments";
