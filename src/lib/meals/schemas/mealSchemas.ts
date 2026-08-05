import { z } from 'zod';

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
  items: z.array(itemSchema).min(1),
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
    .optional(),
  aiRawResponse: z.unknown().optional(),
  localDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data inválido. Use YYYY-MM-DD.'),
});

export const UpdateMealSchema = z.object({
  items: z.array(itemSchema).min(1),
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
    .optional(),
  aiRawResponse: z.unknown().optional(),
});

//scheme to validate the search date
export const DateSchema = z
  .object({
    from: z
      .string()
      .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        'Formato de data inválido. Use YYYY-MM-DD.',
      ),
    to: z
      .string()
      .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        'Formato de data inválido. Use YYYY-MM-DD.',
      ),
  })
  .refine((data) => data.from <= data.to, {
    message: 'A data inicial deve ser menor que a data final.',
    path: ['from'],
  })
  .refine(
    (data) => {
      const umDia = 1000 * 60 * 60 * 24;
      const dias =
        (new Date(data.to).getTime() - new Date(data.from).getTime()) / umDia;
      return dias <= 31;
    },
    { message: 'O intervalo não pode passar de 31 dias.' },
  );

export type DateSchemaType = z.infer<typeof DateSchema>;

export type UpdateMealPayload = z.infer<typeof UpdateMealSchema>;
export type CreateMealPayload = z.infer<typeof CreateMealSchema>;
