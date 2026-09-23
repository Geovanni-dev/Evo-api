import type { FoodReference } from '@prisma/client';
import {
  AlimentoNaoPermitidoError,
  DietaForaDaMetaError,
  QuantidadeInvalidaError,
} from '../../../errors.js';
import { proposedMealPlanSchema } from '../schemas/mealPlanAI.js';

// ------------ Types

type Portion = {
  food: FoodReference;
  grams: number;
};

type Targets = {
  dailyCalorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
};

type Nutrition = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

type PortionWithLimits = Portion & {
  min: number;
  max: number;
};

const NUTRIENTS = ['calories', 'protein', 'carbs', 'fat'] as const;

// ------------ Validation and calculations

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

export function getFoodById(
  foodId: string,
  foodsById: Map<string, FoodReference>,
): FoodReference {
  const food = foodsById.get(foodId);

  if (!food) {
    throw new AlimentoNaoPermitidoError(`Alimento não permitido: ${foodId}`);
  }

  return food;
}

// ------------ Portion fitting

type ProposedPlan = ReturnType<typeof validateProposedMealPlan>;
type ProposedDay = ProposedPlan['dayA'];

export function resolveDayFoods(
  day: ProposedDay,
  foodsById: Map<string, FoodReference>,
) {
  return {
    meals: day.meals.map((meal) => ({
      mealType: meal.mealType,
      foods: meal.items.map((item) => getFoodById(item.foodId, foodsById)),
    })),
  };
}

type ResolvedDay = ReturnType<typeof resolveDayFoods>;

function portionRange(food: FoodReference) {
  if (food.category === 'protein') return { min: 40, max: 250 };
  if (food.category === 'carb') return { min: 30, max: 300 };
  if (food.category === 'fruit') return { min: 50, max: 250 };
  if (food.category === 'vegetable') return { min: 30, max: 250 };
  if (food.category === 'dairy') return { min: 60, max: 300 };
  if (food.category === 'supplement') return { min: 20, max: 80 };

  if (food.category === 'fat') {
    return food.fatPer100g >= 80 ? { min: 5, max: 30 } : { min: 20, max: 150 };
  }

  return { min: 10, max: 250 };
}

function nutritionPerGram(food: FoodReference): Nutrition {
  return {
    calories: food.caloriesPer100g / 100,
    protein: food.proteinPer100g / 100,
    carbs: food.carbsPer100g / 100,
    fat: food.fatPer100g / 100,
  };
}

export function fitDayPortions(day: ResolvedDay, targets: Targets) {
  const portions: PortionWithLimits[] = day.meals.flatMap((meal) =>
    meal.foods.map((food) => {
      const { min, max } = portionRange(food);

      return {
        food,
        grams: (min + max) / 2,
        min,
        max,
      };
    }),
  );

  const goal: Nutrition = {
    calories: targets.dailyCalorieTarget,
    protein: targets.proteinTarget,
    carbs: targets.carbsTarget,
    fat: targets.fatTarget,
  };

  const tolerance: Nutrition = {
    calories: 50,
    protein: Math.max(5, targets.proteinTarget * 0.05),
    carbs: Math.max(5, targets.carbsTarget * 0.05),
    fat: Math.max(5, targets.fatTarget * 0.05),
  };

  const weights: Nutrition = {
    calories: 1 / tolerance.calories ** 2,
    protein: 1 / tolerance.protein ** 2,
    carbs: 1 / tolerance.carbs ** 2,
    fat: 1 / tolerance.fat ** 2,
  };

  const coefficients = portions.map((portion) =>
    nutritionPerGram(portion.food),
  );
  const current = calculateTotal(portions);

  for (let pass = 0; pass < 5; pass++) {
    for (let iteration = 0; iteration < 1000; iteration++) {
      let largestChange = 0;

      for (let index = 0; index < portions.length; index++) {
        const portion = portions[index];
        const coefficient = coefficients[index];

        if (!portion || !coefficient) continue;

        let numerator = 0;
        let denominator = 0;

        for (const nutrient of NUTRIENTS) {
          numerator +=
            coefficient[nutrient] *
            (goal[nutrient] - current[nutrient]) *
            weights[nutrient];

          denominator += coefficient[nutrient] ** 2 * weights[nutrient];
        }

        if (denominator === 0) continue;

        const nextGrams = Math.max(
          portion.min,
          Math.min(portion.max, portion.grams + numerator / denominator),
        );

        const change = nextGrams - portion.grams;
        portion.grams = nextGrams;
        largestChange = Math.max(largestChange, Math.abs(change));

        for (const nutrient of NUTRIENTS) {
          current[nutrient] += coefficient[nutrient] * change;
        }
      }

      if (largestChange < 0.001) break;
    }

    if (
      NUTRIENTS.every(
        (nutrient) =>
          Math.abs(current[nutrient] - goal[nutrient]) <= tolerance[nutrient],
      )
    ) {
      break;
    }

    for (const nutrient of NUTRIENTS) {
      if (Math.abs(current[nutrient] - goal[nutrient]) > tolerance[nutrient]) {
        weights[nutrient] *= 5;
      }
    }
  }

  for (const portion of portions) {
    portion.grams = Math.round(portion.grams);
  }

  const finalTotal = calculateTotal(portions);
  const outsideTolerance = NUTRIENTS.some(
    (nutrient) =>
      Math.abs(finalTotal[nutrient] - goal[nutrient]) > tolerance[nutrient],
  );

  if (outsideTolerance) {
    throw new DietaForaDaMetaError({ goal, finalTotal });
  }

  let index = 0;

  return {
    meals: day.meals.map((meal) => ({
      mealType: meal.mealType,
      portions: meal.foods.map(() => {
        const portion = portions[index++];

        if (!portion) {
          throw new DietaForaDaMetaError();
        }

        return { food: portion.food, grams: portion.grams };
      }),
    })),
  };
}

type FittedDay = ReturnType<typeof fitDayPortions>;

export function buildFinalDay(day: FittedDay) {
  return {
    meals: day.meals.map((meal) => ({
      mealType: meal.mealType,
      items: meal.portions.map(({ food, grams }) => ({
        name: food.name,
        quantity: grams,
        unit: 'g',
        ...calculateFoodNutrition(food, grams),
      })),
    })),
  };
}

export function buildFinalTemplates(
  raw: unknown,
  allowedFoods: FoodReference[],
  targets: Targets,
) {
  const proposal = validateProposedMealPlan(raw, allowedFoods);
  const foodsById = buildFoodsById(allowedFoods);

  const build = (day: ProposedDay) =>
    buildFinalDay(fitDayPortions(resolveDayFoods(day, foodsById), targets));

  return {
    dayA: build(proposal.dayA),
    dayB: build(proposal.dayB),
    dayC: build(proposal.dayC),
    dayD: build(proposal.dayD),
  };
}
