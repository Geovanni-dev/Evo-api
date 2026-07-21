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

// Meal types
const MEALS = ['cafe_da_manha', 'almoco', 'lanche_da_tarde', 'jantar'] as const;

// Validate a single meal with at least one food
const mealSchema = z.array(z.string().min(1, 'Food name cannot be empty'));

// validate one day
export const daySchema = z.object(
  Object.fromEntries(MEALS.map((meal) => [meal, mealSchema])) as {
    [K in (typeof MEALS)[number]]: typeof mealSchema;
  },
);

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
