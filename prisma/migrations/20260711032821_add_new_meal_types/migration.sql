/*
  Warnings:

  - The values [lanche,livre] on the enum `MealType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "MealType_new" AS ENUM ('cafe_da_manha', 'almoco', 'lanche_da_manha', 'lanche_da_tarde', 'jantar', 'ceia', 'pre_treino', 'pos_treino', 'outros');
ALTER TYPE "MealType" RENAME TO "MealType_old";
ALTER TYPE "MealType_new" RENAME TO "MealType";
DROP TYPE "MealType_old";
COMMIT;
