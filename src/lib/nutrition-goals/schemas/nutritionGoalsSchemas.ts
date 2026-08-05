import { z } from 'zod';

const nutritionGoalSchema = z.object({
  dailyCalorieTarget: z.number().min(0),
  proteinTarget: z.number().min(0),
  carbsTarget: z.number().min(0),
  fatTarget: z.number().min(0),
});

export type NutritionGoalPayload = z.infer<typeof nutritionGoalSchema>;

export default nutritionGoalSchema;
