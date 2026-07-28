import { z } from 'zod'; // Import the zod library for schema validation

// Days of the week
const DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

const foodItemSchema = z.object({
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
  mealType: z.string().min(1, 'Tipo de refeição é obrigatório'),
  items: z
    .array(foodItemSchema)
    .min(1, 'Refeição deve ter pelo menos um alimento'),
});

// validate one day
const daySchema = z.object({
  meals: z.array(mealSchema).min(4).max(6),
});

// Validate the full weekly diet
export const MealPlanSchema = z.object(
  Object.fromEntries(DAYS.map((day) => [day, daySchema])) as {
    [K in (typeof DAYS)[number]]: typeof daySchema;
  },
);
// TypeScript type for just the diet skeleton
export type MealPlanPayload = z.infer<typeof MealPlanSchema>;

//  When the user accepts
const ActiveMealPlan = z.object({
  status: z.literal('active'),
  planJson: MealPlanSchema,
});

// When the user rejects
const RejectedMealPlan = z.object({
  status: z.literal('rejected'),
  planJson: z.any().optional(),
});

// Discriminated union
export const MealPlanRequestSchema = z.discriminatedUnion('status', [
  ActiveMealPlan,
  RejectedMealPlan,
]);

// typeScript type for the whole request body
export type MealPlanRequestPayload = z.infer<typeof MealPlanRequestSchema>;
