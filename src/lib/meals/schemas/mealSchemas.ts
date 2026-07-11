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
  fiber: z.number().min(0),
});

const mealSchema = z.object({
  items: z.array(itemSchema).min(1), // Validate that the items is an array of itemSchema with at least one item
  date: z.coerce.date().optional(), // Validate that the date is a valid date, optional
  mealType: z
    .enum([
      'cafe_da_manha, lanche_da_manha, almoco, pre_treino, pos_treino, lanche_da_tarde, jantar, ceia,, outros',
    ])
    .optional(), // Validate that the mealType is one of the specified enum values
  aiRawResponse: z.unknown().optional(), // Validate that the aiRawResponse is of unknown type, optional
});

export type CreateMealPayload = z.infer<typeof mealSchema>; // Infer the TypeScript type for the mealSchema

export default mealSchema; // Export the mealSchema for use in other parts of the application
