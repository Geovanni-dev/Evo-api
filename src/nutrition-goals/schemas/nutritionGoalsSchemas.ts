import { z } from 'zod'; // Import the zod library for schema validation

// Define a schema for nutrition goal validation using zod

const nutritionGoalSchema = z.object({
  dailyCalorieTarget: z.number().min(0),
  proteinTarget: z.number().min(0),
  carbsTarget: z.number().min(0),
  fatTarget: z.number().min(0),
});

// Export the schema for use in other parts of the application
export type NutritionGoalPayload = z.infer<typeof nutritionGoalSchema>;

export default nutritionGoalSchema;
