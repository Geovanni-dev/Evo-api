/*
  Warnings:

  - The `mealType` column on the `Meal` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Meal" DROP COLUMN "mealType",
ADD COLUMN     "mealType" TEXT NOT NULL DEFAULT 'livre';
