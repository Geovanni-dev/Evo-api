/*
  Warnings:

  - The values [outros] on the enum `MealType` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `date` to the `Meal` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "MealType_new" AS ENUM ('cafe_da_manha', 'almoco', 'lanche_da_manha', 'lanche_da_tarde', 'jantar', 'ceia', 'pre_treino', 'pos_treino', 'refeicao_livre');
ALTER TYPE "MealType" RENAME TO "MealType_old";
ALTER TYPE "MealType_new" RENAME TO "MealType";
DROP TYPE "MealType_old";
COMMIT;

-- AlterTable
ALTER TABLE "Meal" ADD COLUMN     "date" DATE NOT NULL,
ALTER COLUMN "mealType" SET DEFAULT 'refeicao_livre';

-- CreateIndex
CREATE INDEX "Meal_userId_date_idx" ON "Meal"("userId", "date");
