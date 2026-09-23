import { z } from 'zod';
import { MEAL_TYPES } from './mealPlanSchema.js';

// AI selects food IDs only, backend will define portions and nutrients
export const proposedItemSchema = z
  .object({
    foodId: z.string().uuid(),
  })
  .strict();

// each meal must have a valid type and at least one selected food
const proposedMealSchema = z
  .object({
    mealType: z.enum(MEAL_TYPES),
    items: z.array(proposedItemSchema).min(1),
  })
  .strict();

//a day can contain 4 to 6 meals.
const proposedDaySchema = z
  .object({
    meals: z.array(proposedMealSchema).min(4).max(6),
  })
  .strict();

// AI returns four day templates, the backend expands them into a week
export const proposedMealPlanSchema = z
  .object({
    dayA: proposedDaySchema,
    dayB: proposedDaySchema,
    dayC: proposedDaySchema,
    dayD: proposedDaySchema,
  })
  .strict();
