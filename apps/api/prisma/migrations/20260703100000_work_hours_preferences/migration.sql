-- AlterTable
ALTER TABLE "User" ADD COLUMN "dailyWorkHours" DECIMAL(4,2) NOT NULL DEFAULT 8;
ALTER TABLE "User" ADD COLUMN "includeSaturdays" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "includeSundays" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "onlyBillableProjects" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Client" ADD COLUMN "dailyWorkHours" DECIMAL(4,2);
ALTER TABLE "Client" ADD COLUMN "includeSaturdays" BOOLEAN;
ALTER TABLE "Client" ADD COLUMN "includeSundays" BOOLEAN;
ALTER TABLE "Client" ADD COLUMN "defaultHourlyRate" DECIMAL(10,2);
ALTER TABLE "Client" ADD COLUMN "defaultCurrency" VARCHAR(3);
