-- CreateEnum
CREATE TYPE "FoodCategory" AS ENUM ('protein', 'carb', 'fat', 'fruit', 'vegetable', 'dairy', 'supplement');

-- CreateTable
CREATE TABLE "FoodReference" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "FoodCategory" NOT NULL,
    "caloriesPer100g" DOUBLE PRECISION NOT NULL,
    "proteinPer100g" DOUBLE PRECISION NOT NULL,
    "carbsPer100g" DOUBLE PRECISION NOT NULL,
    "fatPer100g" DOUBLE PRECISION NOT NULL,
    "defaultUnit" TEXT NOT NULL DEFAULT 'g',
    "source" TEXT,

    CONSTRAINT "FoodReference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FoodReference_name_key" ON "FoodReference"("name");

-- CreateIndex
CREATE INDEX "FoodReference_category_idx" ON "FoodReference"("category");
