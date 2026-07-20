import { z } from 'zod'; // Import the zod library for schema validation

// Define a schema for meal plan validation using zod

export const mealplanJson = z.object({
  //planJson: z.object({}),
  status: z.enum(['active', 'rejected']),
});
