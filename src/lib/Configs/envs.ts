import { z } from 'zod';

const envSchema = z.object({
  GEMINI_API_KEY: z.string(),
  GOOGLE_GENAI_API_KEY: z.string(),
  DEEPSEEK_KEY: z.string(),
});

export const env = envSchema.parse(process.env);
