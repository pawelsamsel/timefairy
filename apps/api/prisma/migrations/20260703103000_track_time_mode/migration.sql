-- CreateEnum
CREATE TYPE "TrackTimeMode" AS ENUM ('SINGLE', 'MULTI', 'ASK');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "trackTimeMode" "TrackTimeMode" NOT NULL DEFAULT 'SINGLE';
