import { z } from 'zod';

export const payloadUserSchema = z.object({
  sub: z.string().uuid(),
  sid: z.string().uuid(),
  iat: z.number().int(),
  exp: z.number().int(),
});
