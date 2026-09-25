import { z } from 'zod';
import { MEAL_TYPES } from './mealPlanSchema.js';

export const proposedItemSchema = z
  .object({
    foodId: z.string().uuid(),
  })
  .strict();

const proposedMealSchema = z
  .object({
    mealType: z.enum(MEAL_TYPES),
    items: z.array(proposedItemSchema).min(1),
  })
  .strict();

const proposedDaySchema = z
  .object({
    meals: z.array(proposedMealSchema).min(4).max(6),
  })
  .strict();

export const proposedMealPlanSchema = z
  .object({
    dayA: proposedDaySchema,
    dayB: proposedDaySchema,
    dayC: proposedDaySchema,
    dayD: proposedDaySchema,
  })
  .strict();

export type MealPlanValidationOptions = {
  dietCategory?: string;
  mealsPerDay?: number;
};

export function buildProposedMealPlanSchema(
  options: MealPlanValidationOptions,
) {
  const isFit = options.dietCategory === 'fit';
  const mealCount = options.mealsPerDay ?? (isFit ? 5 : 4);
  const fitMealTypes: (typeof MEAL_TYPES)[number][] = [
    'cafe_da_manha',
    'almoco',
    'pre_treino',
    'pos_treino',
    'jantar',
  ];
  if (mealCount === 6) fitMealTypes.push('ceia');

  return proposedMealPlanSchema.superRefine((plan, ctx) => {
    if (
      !Number.isInteger(mealCount) ||
      mealCount < 4 ||
      mealCount > 6 ||
      (isFit && mealCount < 5)
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'Número de refeições incompatível com a categoria da dieta',
      });
      return;
    }

    for (const [dayName, day] of Object.entries(plan)) {
      const mealTypes = day.meals.map((meal) => meal.mealType);
      const path = [dayName, 'meals'];

      if (mealTypes.length !== mealCount) {
        ctx.addIssue({
          code: 'custom',
          path,
          message: `Esperadas ${mealCount} refeições em ${dayName}`,
        });
      }

      if (new Set(mealTypes).size !== mealTypes.length) {
        ctx.addIssue({
          code: 'custom',
          path,
          message: `Tipos de refeição repetidos em ${dayName}`,
        });
      }

      if (isFit) {
        const missingTypes = fitMealTypes.filter(
          (mealType) => !mealTypes.includes(mealType),
        );
        const unexpectedTypes = mealTypes.filter(
          (mealType) => !fitMealTypes.includes(mealType),
        );

        if (missingTypes.length > 0 || unexpectedTypes.length > 0) {
          ctx.addIssue({
            code: 'custom',
            path,
            message: `Tipos de refeição incompatíveis com dieta fit em ${dayName}`,
          });
        }

        const preWorkoutIndex = mealTypes.indexOf('pre_treino');
        const postWorkoutIndex = mealTypes.indexOf('pos_treino');

        if (
          preWorkoutIndex !== -1 &&
          postWorkoutIndex !== -1 &&
          preWorkoutIndex > postWorkoutIndex
        ) {
          ctx.addIssue({
            code: 'custom',
            path,
            message: `Pós-treino deve vir depois do pré-treino em ${dayName}`,
          });
        }
      } else if (
        mealTypes.includes('pre_treino') ||
        mealTypes.includes('pos_treino')
      ) {
        ctx.addIssue({
          code: 'custom',
          path,
          message: `Pré e pós-treino não pertencem à dieta normal em ${dayName}`,
        });
      }
    }
  });
}
