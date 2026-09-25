/*
  Warnings:

  - The values [breakfast,lunch,dinner,snack,auto] on the enum `MealType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "MealType_new" AS ENUM ('cafe_da_manha', 'almoco', 'lanche', 'jantar', 'ceia', 'livre');
ALTER TABLE "Meal" ALTER COLUMN "mealType" DROP DEFAULT;
ALTER TABLE "Meal" ALTER COLUMN "mealType" TYPE "MealType_new" USING ("mealType"::text::"MealType_new");
ALTER TYPE "MealType" RENAME TO "MealType_old";
ALTER TYPE "MealType_new" RENAME TO "MealType";
DROP TYPE "MealType_old";
ALTER TABLE "Meal" ALTER COLUMN "mealType" SET DEFAULT 'livre';
COMMIT;

-- AlterTable
ALTER TABLE "Meal" ALTER COLUMN "mealType" SET DEFAULT 'livre';
