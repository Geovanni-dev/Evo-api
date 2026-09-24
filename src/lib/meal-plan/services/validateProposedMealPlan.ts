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
  preferred: number;
  max: number;
};

const NUTRIENTS = ['calories', 'protein', 'carbs', 'fat'] as const;

function limitsVariety(food: FoodReference) {
  return (
    food.category === 'fruit' ||
    food.category === 'dairy' ||
    (food.category === 'fat' && food.fatPer100g < 80)
  );
}

// ------------ Validation and calculations

export function validateProposedMealPlan(
  raw: unknown,
  allowedFoods: FoodReference[],
) {
  const proposal = proposedMealPlanSchema.parse(raw);
  const foodsById = buildFoodsById(allowedFoods);
  const selectedIds = new Set<string>();

  for (const day of Object.values(proposal)) {
    for (const meal of day.meals) {
      for (const item of meal.items) {
        if (!foodsById.has(item.foodId)) {
          throw new AlimentoNaoPermitidoError(
            `Alimento não permitido: ${item.foodId}`,
          );
        }
        selectedIds.add(item.foodId);
      }
    }
  }

  const selectedFoods = allowedFoods.filter((food) => selectedIds.has(food.id));
  const foodDays = new Map<string, Set<string>>();

  for (const [dayName, day] of Object.entries(proposal)) {
    const dayCounts = new Map<string, number>();

    for (const meal of day.meals) {
      for (const item of meal.items) {
        let food = getFoodById(item.foodId, foodsById);

        if (!limitsVariety(food)) {
          continue;
        }

        const days = foodDays.get(food.id);
        const repeatedInDay = (dayCounts.get(food.id) ?? 0) >= 2;
        const repeatedAcrossDays =
          (days?.size ?? 0) >= 3 && !days?.has(dayName);

        if (repeatedInDay || repeatedAcrossDays) {
          const replacement = selectedFoods
            .filter((candidate) => {
              const candidateDays = foodDays.get(candidate.id);
              const calorieRatio =
                candidate.caloriesPer100g / Math.max(food.caloriesPer100g, 1);

              return (
                candidate.id !== food.id &&
                candidate.category === food.category &&
                limitsVariety(candidate) &&
                candidate.defaultUnit === food.defaultUnit &&
                calorieRatio >= 0.5 &&
                calorieRatio <= 2 &&
                !meal.items.some(
                  (mealItem) =>
                    mealItem !== item && mealItem.foodId === candidate.id,
                ) &&
                (dayCounts.get(candidate.id) ?? 0) < 2 &&
                ((candidateDays?.size ?? 0) < 3 || candidateDays?.has(dayName))
              );
            })
            .sort((a, b) => {
              const score = (candidate: FoodReference) =>
                (dayCounts.get(candidate.id) ?? 0) * 10 +
                (foodDays.get(candidate.id)?.size ?? 0) * 5 +
                Math.abs(candidate.caloriesPer100g - food.caloriesPer100g) /
                  Math.max(food.caloriesPer100g, 1) +
                Math.abs(candidate.proteinPer100g - food.proteinPer100g) / 20 +
                Math.abs(candidate.carbsPer100g - food.carbsPer100g) / 20 +
                Math.abs(candidate.fatPer100g - food.fatPer100g) / 20;
              return score(a) - score(b);
            })[0];

          if (replacement) {
            item.foodId = replacement.id;
            food = replacement;
          }
        }

        dayCounts.set(food.id, (dayCounts.get(food.id) ?? 0) + 1);
        const usedDays = foodDays.get(food.id) ?? new Set<string>();
        usedDays.add(dayName);
        foodDays.set(food.id, usedDays);
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
  const name = food.name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (/\b(feijao|lentilha|ervilha|tremoco)\b/.test(name)) {
    return { min: 60, preferred: 100, max: 180 };
  }

  if (food.category === 'protein') {
    return { min: 40, preferred: 140, max: 250 };
  }

  if (food.category === 'carb') {
    return food.caloriesPer100g >= 200
      ? { min: 25, preferred: 60, max: 150 }
      : { min: 30, preferred: 150, max: 300 };
  }

  if (food.category === 'fruit') {
    return { min: 80, preferred: 130, max: 250 };
  }

  if (food.category === 'vegetable') {
    return { min: 80, preferred: 120, max: 250 };
  }

  if (food.category === 'dairy') {
    return food.caloriesPer100g >= 140
      ? { min: 20, preferred: 45, max: 120 }
      : { min: 80, preferred: 170, max: 300 };
  }

  if (food.category === 'supplement') {
    return { min: 20, preferred: 35, max: 80 };
  }

  if (food.category === 'fat') {
    if (food.fatPer100g >= 80) {
      return { min: 5, preferred: 10, max: 30 };
    }
    return food.fatPer100g >= 35
      ? { min: 15, preferred: 25, max: 70 }
      : { min: 40, preferred: 100, max: 200 };
  }

  return { min: 20, preferred: 100, max: 250 };
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
  const distribution: Record<ResolvedDay['meals'][number]['mealType'], number> =
    {
      cafe_da_manha: 20,
      lanche_da_manha: 10,
      almoco: 30,
      lanche_da_tarde: 10,
      pre_treino: 10,
      pos_treino: 10,
      jantar: 30,
      ceia: 10,
    };

  const totalWeight = day.meals.reduce(
    (sum, meal) => sum + distribution[meal.mealType],
    0,
  );

  const mealGoals = day.meals.map((meal) => {
    const calories =
      (targets.dailyCalorieTarget * distribution[meal.mealType]) / totalWeight;
    const tolerance = Math.max(100, calories * 0.2);
    const isMainMeal = meal.mealType === 'almoco' || meal.mealType === 'jantar';

    return {
      calories,
      tolerance,
      proteinMin: isMainMeal ? targets.proteinTarget * 0.25 : 0,
      calorieWeight: 1 / tolerance ** 2,
      proteinWeight: 1 / Math.max(5, targets.proteinTarget * 0.05) ** 2,
    };
  });

  const portions: (PortionWithLimits & { mealIndex: number })[] =
    day.meals.flatMap((meal, mealIndex) =>
      meal.foods.map((food) => {
        const { min, preferred, max } = portionRange(food);

        return {
          food,
          grams: preferred,
          min,
          preferred,
          max,
          mealIndex,
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
  const mealTotals = day.meals.map(() => ({
    calories: 0,
    protein: 0,
  }));

  for (let index = 0; index < portions.length; index++) {
    const portion = portions[index];
    const coefficient = coefficients[index];

    if (!portion || !coefficient) continue;

    const mealTotal = mealTotals[portion.mealIndex];
    if (!mealTotal) continue;

    mealTotal.calories += coefficient.calories * portion.grams;
    mealTotal.protein += coefficient.protein * portion.grams;
  }

  for (let pass = 0; pass < 6; pass++) {
    for (let iteration = 0; iteration < 1000; iteration++) {
      let largestChange = 0;

      for (let index = 0; index < portions.length; index++) {
        const portion = portions[index];
        const coefficient = coefficients[index];

        if (!portion || !coefficient) continue;

        const mealGoal = mealGoals[portion.mealIndex];
        const mealTotal = mealTotals[portion.mealIndex];

        if (!mealGoal || !mealTotal) continue;

        let numerator = 0;
        let denominator = 0;

        for (const nutrient of NUTRIENTS) {
          numerator +=
            coefficient[nutrient] *
            (goal[nutrient] - current[nutrient]) *
            weights[nutrient];

          denominator += coefficient[nutrient] ** 2 * weights[nutrient];
        }

        numerator +=
          coefficient.calories *
          (mealGoal.calories - mealTotal.calories) *
          mealGoal.calorieWeight;

        denominator += coefficient.calories ** 2 * mealGoal.calorieWeight;

        if (mealTotal.protein < mealGoal.proteinMin) {
          numerator +=
            coefficient.protein *
            (mealGoal.proteinMin - mealTotal.protein) *
            mealGoal.proteinWeight;

          denominator += coefficient.protein ** 2 * mealGoal.proteinWeight;
        }

        const preferredWeight =
          0.15 / Math.max(20, (portion.max - portion.min) / 2) ** 2;
        numerator += (portion.preferred - portion.grams) * preferredWeight;
        denominator += preferredWeight;

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

        mealTotal.calories += coefficient.calories * change;
        mealTotal.protein += coefficient.protein * change;
      }

      if (largestChange < 0.001) break;
    }

    const dailyOk = NUTRIENTS.every(
      (nutrient) =>
        Math.abs(current[nutrient] - goal[nutrient]) <= tolerance[nutrient],
    );

    const mealsOk = mealGoals.every((mealGoal, index) => {
      const mealTotal = mealTotals[index];

      return (
        mealTotal !== undefined &&
        Math.abs(mealTotal.calories - mealGoal.calories) <=
          mealGoal.tolerance &&
        mealTotal.protein >= mealGoal.proteinMin
      );
    });

    if (dailyOk && mealsOk) break;

    for (const nutrient of NUTRIENTS) {
      if (Math.abs(current[nutrient] - goal[nutrient]) > tolerance[nutrient]) {
        weights[nutrient] *= 5;
      }
    }

    for (let index = 0; index < mealGoals.length; index++) {
      const mealGoal = mealGoals[index];
      const mealTotal = mealTotals[index];

      if (!mealGoal || !mealTotal) continue;

      if (
        Math.abs(mealTotal.calories - mealGoal.calories) > mealGoal.tolerance
      ) {
        mealGoal.calorieWeight *= 5;
      }

      if (mealTotal.protein < mealGoal.proteinMin) {
        mealGoal.proteinWeight *= 5;
      }
    }
  }

  for (const portion of portions) {
    portion.grams = Math.round(portion.grams);
  }

  const finalTotal = calculateTotal(portions);
  const finalMealTotals = day.meals.map(() => ({
    calories: 0,
    protein: 0,
  }));

  for (const portion of portions) {
    const mealTotal = finalMealTotals[portion.mealIndex];
    if (!mealTotal) continue;

    const nutrition = calculateFoodNutrition(portion.food, portion.grams);

    mealTotal.calories += nutrition.calories;
    mealTotal.protein += nutrition.protein;
  }

  const outsideDailyTolerance = NUTRIENTS.some(
    (nutrient) =>
      Math.abs(finalTotal[nutrient] - goal[nutrient]) > tolerance[nutrient],
  );

  const outsideMealTolerance = mealGoals.some((mealGoal, index) => {
    const mealTotal = finalMealTotals[index];

    return (
      !mealTotal ||
      Math.abs(mealTotal.calories - mealGoal.calories) > mealGoal.tolerance ||
      mealTotal.protein < mealGoal.proteinMin - 1
    );
  });

  if (outsideDailyTolerance || outsideMealTolerance) {
    throw new DietaForaDaMetaError({
      goal,
      finalTotal,
      meals: mealGoals.map((mealGoal, index) => ({
        targetCalories: mealGoal.calories,
        calories: finalMealTotals[index]?.calories,
        minProtein: mealGoal.proteinMin,
        protein: finalMealTotals[index]?.protein,
      })),
    });
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
