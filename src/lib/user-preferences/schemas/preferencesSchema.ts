import { z } from 'zod';

export const PreferenceSchema = z.object({
  dietType: z.string().optional(),
  dietCategory: z.string().optional(),
  suplementUse: z.string().optional(),
  mealsPerDay: z.number().int().min(4).max(6).default(4),
  likedFoods: z.array(z.string()).optional(),
  dislikedFoods: z.array(z.string()).optional(),
  avoidFoods: z.array(z.string()).optional(),
});

export const RestrictionSchema = z.object({
  intolerances: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  healthConditions: z.array(z.string()).optional(),
  observations: z.string().optional(),
});

export type PreferencePayload = z.infer<typeof PreferenceSchema>;
export type RestrictionPayload = z.infer<typeof RestrictionSchema>;
