/*
  Warnings:

  - You are about to drop the column `fiber` on the `DailySummary` table. All the data in the column will be lost.
  - You are about to drop the column `fiber` on the `MealItem` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "DailySummary" DROP COLUMN "fiber";

-- AlterTable
ALTER TABLE "MealItem" DROP COLUMN "fiber";
