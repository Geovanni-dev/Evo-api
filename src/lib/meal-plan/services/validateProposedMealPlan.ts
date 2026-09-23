import {
  AlimentoNaoPermitidoError,
  QuantidadeInvalidaError,
} from '../../../errors.js';
import { proposedMealPlanSchema } from '../schemas/mealPlanAI.js';
import type { FoodReference } from '@prisma/client';

// ------------ types

type Portion = {
  food: FoodReference;
  grams: number;
};

// ---------- functions

export function validateProposedMealPlan(
  raw: unknown,
  allowedFoods: { id: string }[],
) {
  const proposal = proposedMealPlanSchema.parse(raw);
  const allowedIds = new Set(allowedFoods.map((food) => food.id));
  for (const day of Object.values(proposal)) {
    for (const meal of day.meals) {
      for (const item of meal.items) {
        // a valid UUID must also belong to the foods allowed for this user
        if (!allowedIds.has(item.foodId)) {
          throw new AlimentoNaoPermitidoError(
            `Alimento não permitido: ${item.foodId}`,
          );
        }
      }
    }
  }
  return proposal;
}

export function calculateFoodNutrition(food: FoodReference, grams: number) {
  const isFinite = Number.isFinite(grams);
  const isPositive = grams > 0;
  if (!isFinite || !isPositive) {
    throw new QuantidadeInvalidaError(`Quantidade inválida: ${grams}`);
  }
  const factor = grams / 100;
  return {
    calories: food.caloriesPer100g * factor,
    protein: food.proteinPer100g * factor,
    carbs: food.carbsPer100g * factor,
    fat: food.fatPer100g * factor,
  };
}

export function calculateTotal(portions: Portion[]) {
  const total = { calories: 0, protein: 0, carbs: 0, fat: 0 };

  for (const portion of portions) {
    const nutrition = calculateFoodNutrition(portion.food, portion.grams);
    total.calories += nutrition.calories;
    total.protein += nutrition.protein;
    total.carbs += nutrition.carbs;
    total.fat += nutrition.fat;
  }
  return total;
}

export function buildFoodsById(allowedFoods: FoodReference[]) {
  const foodsById = new Map<string, FoodReference>();

  for (const food of allowedFoods) {
    foodsById.set(food.id, food);
  }
  return foodsById;
}
