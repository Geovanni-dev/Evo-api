import { z } from 'zod'; // Import the zod library for schema validation

// Define a schema for user preferences validation using zod

// Define a schema for user preferences
export const PreferenceSchema = z.object({
  dietType: z.string().optional(),
  mealsPerDay: z.number().int().min(4).max(6).default(4),
  likedFoods: z.array(z.string()).optional(),
  dislikedFoods: z.array(z.string()).optional(),
  avoidFoods: z.array(z.string()).optional(),
});

// Define a schema for user restrictions
export const RestrictionSchema = z.object({
  intolerances: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  healthConditions: z.array(z.string()).optional(),
  observations: z.string().optional(),
});

export type PreferencePayload = z.infer<typeof PreferenceSchema>; // Infer the TypeScript type for the PreferenceSchema
export type RestrictionPayload = z.infer<typeof RestrictionSchema>; // Infer the TypeScript type for the RestrictionSchema
