import { z } from 'zod';

export const DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export const MEAL_TYPES = [
  'cafe_da_manha',
  'lanche_da_manha',
  'almoco',
  'lanche_da_tarde',
  'pre_treino',
  'pos_treino',
  'jantar',
  'ceia',
] as const;

export const foodItemSchema = z.object({
  name: z.string().min(1, 'Nome do alimento é obrigatório'),
  quantity: z.number().positive('Quantidade deve ser maior que zero'),
  unit: z.string().min(1, 'Unidade é obrigatória'), // "g", "ml", "unidade", "colher de sopa", etc.
  calories: z.number().nonnegative('Calorias não podem ser negativas'),
  protein: z.number().nonnegative('Proteína não pode ser negativa'),
  carbs: z.number().nonnegative('Carboidrato não pode ser negativo'),
  fat: z.number().nonnegative('Gordura não pode ser negativa'),
});

const mealSchema = z.object({
  mealType: z.enum(MEAL_TYPES),
  items: z
    .array(foodItemSchema)
    .min(1, 'Refeição deve ter pelo menos um alimento'),
});

const daySchema = z.object({
  meals: z.array(mealSchema).min(4).max(6),
});

export const MealPlanShape = z.object(
  Object.fromEntries(DAYS.map((day) => [day, daySchema])) as {
    [K in (typeof DAYS)[number]]: typeof daySchema;
  },
);
export type MealPlanPayload = z.infer<typeof MealPlanShape>;

// builds the schema for a given user, adding the TDEE check.
export function buildMealPlanSchema(tdee: {
  dailyCalorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
}) {
  const TOLERANCE_KCAL = 50;
  const MACRO_TOLERANCE_PCT = 0.05;
  const MACRO_TOLERANCE_MIN = 5;
  const macroTolerance = (target: number) =>
    Math.max(MACRO_TOLERANCE_MIN, target * MACRO_TOLERANCE_PCT);

  return MealPlanShape.superRefine((plan, ctx) => {
    for (const day of DAYS) {
      const meals = plan[day].meals;

      const total = meals.reduce(
        (daySum, meal) => {
          const mealTotal = meal.items.reduce(
            (sum, item) => ({
              calories: sum.calories + item.calories,
              protein: sum.protein + item.protein,
              carbs: sum.carbs + item.carbs,
              fat: sum.fat + item.fat,
            }),
            { calories: 0, protein: 0, carbs: 0, fat: 0 },
          );
          return {
            calories: daySum.calories + mealTotal.calories,
            protein: daySum.protein + mealTotal.protein,
            carbs: daySum.carbs + mealTotal.carbs,
            fat: daySum.fat + mealTotal.fat,
          };
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      );

      if (Math.abs(total.calories - tdee.dailyCalorieTarget) > TOLERANCE_KCAL) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [day],
          message: `Total de ${day} (${total.calories}kcal) fora da margem esperada (${tdee.dailyCalorieTarget} ± ${TOLERANCE_KCAL}kcal)`,
        });
      }

      const proteinTolerance = macroTolerance(tdee.proteinTarget);
      if (Math.abs(total.protein - tdee.proteinTarget) > proteinTolerance) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [day],
          message: `Proteínas de ${day} (${total.protein}g) fora da margem esperada (${tdee.proteinTarget} ± ${proteinTolerance.toFixed(0)}g)`,
        });
      }

      const carbsTolerance = macroTolerance(tdee.carbsTarget);
      if (Math.abs(total.carbs - tdee.carbsTarget) > carbsTolerance) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [day],
          message: `Carboidratos de ${day} (${total.carbs}g) fora da margem esperada (${tdee.carbsTarget} ± ${carbsTolerance.toFixed(0)}g)`,
        });
      }

      const fatTolerance = macroTolerance(tdee.fatTarget);
      if (Math.abs(total.fat - tdee.fatTarget) > fatTolerance) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [day],
          message: `Gorduras de ${day} (${total.fat}g) fora da margem esperada (${tdee.fatTarget} ± ${fatTolerance.toFixed(0)}g)`,
        });
      }
    }
  });
}

export function buildMealPlanRequestSchema(tdee: {
  dailyCalorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
}) {
  // When the user accepts
  const ActiveMealPlan = z.object({
    status: z.literal('active'),
    planJson: buildMealPlanSchema(tdee),
  });

  // When the user rejects
  const RejectedMealPlan = z.object({
    status: z.literal('rejected'),
    planJson: z.any().optional(),
  });

  return z.discriminatedUnion('status', [ActiveMealPlan, RejectedMealPlan]);
}

export type MealPlanRequestPayload =
  | { status: 'active'; planJson: MealPlanPayload }
  | { status: 'rejected'; planJson?: unknown };
