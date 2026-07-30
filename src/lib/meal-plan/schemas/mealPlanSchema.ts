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
  'lanche_manha',
  'almoco',
  'lanche_tarde',
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
export function buildMealPlanSchema(tdee: number) {
  const TOLERANCE = 50; // acceptable kcal margin

  return MealPlanShape.superRefine((plan, ctx) => {
    for (const day of DAYS) {
      const meals = plan[day].meals;

      // sum every item's calories, across every meal, for this day
      const totalCalories = meals.reduce((daySum, meal) => {
        const mealTotal = meal.items.reduce(
          (sum, item) => sum + item.calories,
          0,
        );
        return daySum + mealTotal;
      }, 0);

      if (Math.abs(totalCalories - tdee) > TOLERANCE) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [day],
          message: `Total de ${day} (${totalCalories}kcal) fora da margem esperada (${tdee} ± ${TOLERANCE}kcal)`,
        });
      }
    }
  });
}

// builds the discriminated union for a given user's TDEE
export function buildMealPlanRequestSchema(tdee: number) {
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
