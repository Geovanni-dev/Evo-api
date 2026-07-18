import { z } from 'zod'; // Import the zod library for schema validation

// ========================= schema for meal validation using zod

const itemSchema = z.object({
  name: z.string().min(3),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  calories: z.number().min(0),
  protein: z.number().min(0),
  carbs: z.number().min(0),
  fat: z.number().min(0),
});

export const CreateMealSchema = z.object({
  items: z.array(itemSchema).min(1), // Validate that the items is an array of itemSchema with at least one item
  mealType: z
    .enum([
      'cafe_da_manha',
      'lanche_da_manha',
      'almoco',
      'pre_treino',
      'pos_treino',
      'lanche_da_tarde',
      'jantar',
      'ceia',
      'refeicao_livre',
    ])
    .optional(), // Validate that the mealType is one of the specified enum values
  aiRawResponse: z.unknown().optional(), // Validate that the aiRawResponse is of unknown type, optional
  localDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data inválido. Use YYYY-MM-DD.'), // Validate that the localDate is in the format YYYY-MM-DD
});

export const UpdateMealSchema = z.object({
  items: z.array(itemSchema).min(1), // Validate that the items is an array of itemSchema with at least one item
  mealType: z
    .enum([
      'cafe_da_manha',
      'lanche_da_manha',
      'almoco',
      'pre_treino',
      'pos_treino',
      'lanche_da_tarde',
      'jantar',
      'ceia',
      'refeicao_livre',
    ])
    .optional(), // Validate that the mealType is one of the specified enum values
  aiRawResponse: z.unknown().optional(), // Validate that the aiRawResponse is of unknown type, optional
});

export type UpdateMealPayload = z.infer<typeof UpdateMealSchema>; // Infer the TypeScript type for the upadateMealSchema
export type CreateMealPayload = z.infer<typeof CreateMealSchema>; // Infer the TypeScript type for the CreatedMealSchema
