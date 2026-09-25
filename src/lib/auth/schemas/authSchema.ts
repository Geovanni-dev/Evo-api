import { z } from 'zod';

export const googleLoginSchema = z.object({
  idToken: z.string().trim().min(1),
});

export const refreshSessionSchema = z.object({
  refreshToken: z.string().regex(/^[a-f0-9]{64}$/),
});

export type GoogleLoginPayload = z.infer<typeof googleLoginSchema>;
