import { z } from 'zod'; // Import the zod library for schema validation

// Days of the week
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

// validate one meal
const mealSchema = z.object({
  mealType: z.enum(MEAL_TYPES),
  items: z
    .array(foodItemSchema)
    .min(1, 'Refeição deve ter pelo menos um alimento'),
});

// validate one day
const daySchema = z.object({
  meals: z.array(mealSchema).min(4).max(6),
});

// Validate the full weekly diet
export const MealPlanShape = z.object(
  Object.fromEntries(DAYS.map((day) => [day, daySchema])) as {
    [K in (typeof DAYS)[number]]: typeof daySchema;
  },
);
// TypeScript type for just the diet skeleton
export type MealPlanPayload = z.infer<typeof MealPlanShape>;

// builds the schema for a given user, adding the TDEE check.
export function buildMealPlanSchema(tdee: {
  dailyCalorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
}) {
  const TOLERANCE_KCAL = 50; // acceptable kcal margin
  const TOLERANCE_MACRO = 5; // acceptable macro margin

  return MealPlanShape.superRefine((plan, ctx) => {
    for (const day of DAYS) {
      const meals = plan[day].meals;

      // calculate the total
      const total = meals.reduce(
        (daySum, meal) => {
          const mealTotal = meal.items.reduce(
            (sum, item) => ({
              calories: sum.calories + item.calories,
              protein: sum.protein + item.protein,
              carbs: sum.carbs + item.carbs,
              fat: sum.fat + item.fat,
            }),
            { calories: 0, protein: 0, carbs: 0, fat: 0 }, // initial value
          );
          return {
            calories: daySum.calories + mealTotal.calories,
            protein: daySum.protein + mealTotal.protein,
            carbs: daySum.carbs + mealTotal.carbs,
            fat: daySum.fat + mealTotal.fat,
          };
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 }, // initial value
      );

      // check if the total calories are within 50kcal of the TDEE
      if (Math.abs(total.calories - tdee.dailyCalorieTarget) > TOLERANCE_KCAL) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom, // custom error
          path: [day],
          message: `Total de ${day} (${total.calories}kcal) fora da margem esperada (${tdee.dailyCalorieTarget} ± ${TOLERANCE_KCAL}kcal)`,
        });
      }

      // check if the total protein are within 5g of the TDEE
      if (Math.abs(total.protein - tdee.proteinTarget) > TOLERANCE_MACRO) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom, // custom error
          path: [day],
          message: `Proteínas de ${day} (${total.protein}g) fora da margem esperada (${tdee.proteinTarget} ± ${TOLERANCE_MACRO}g)`,
        });
      }

      // check if the total carbs are within 5g of the TDEE
      if (Math.abs(total.carbs - tdee.carbsTarget) > TOLERANCE_MACRO) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom, // custom error
          path: [day],
          message: `Carboidratos de ${day} (${total.carbs}g) fora da margem esperada (${tdee.carbsTarget} ± ${TOLERANCE_MACRO}g)`,
        });
      }

      // check if the total fat are within 5g of the TDEE
      if (Math.abs(total.fat - tdee.fatTarget) > TOLERANCE_MACRO) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom, // custom error
          path: [day],
          message: `Gorduras de ${day} (${total.fat}g) fora da margem esperada (${tdee.fatTarget} ± ${TOLERANCE_MACRO}g)`,
        });
      }
    }
  });
}

// builds the discriminated union for a given user's TDEE
export function buildMealPlanRequestSchema(tdee: {
  dailyCalorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
}) {
  //  When the user accepts
  const ActiveMealPlan = z.object({
    status: z.literal('active'),
    planJson: buildMealPlanSchema(tdee),
  });

  // When the user rejects
  const RejectedMealPlan = z.object({
    status: z.literal('rejected'),
    planJson: z.any().optional(),
  });

  // Discriminated union
  return z.discriminatedUnion('status', [ActiveMealPlan, RejectedMealPlan]);
}

// typeScript type for the whole request body
export type MealPlanRequestPayload =
  | { status: 'active'; planJson: MealPlanPayload }
  | { status: 'rejected'; planJson?: unknown };
