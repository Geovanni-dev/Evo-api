import { AlimentoNaoPermitidoError } from '../../../errors.js';
import { proposedMealPlanSchema } from '../schemas/mealPlanAI.js';

export function validateProposedMealPlan(
  raw: unknown,
  allowedFoods: { id: string }[],
) {
  const proposal = proposedMealPlanSchema.parse(raw);
  const allowedIds = new Set(allowedFoods.map((food) => food.id));
  for (const day of Object.values(proposal)) {
    for (const meal of day.meals) {
      for (const item of meal.items) {
        // a valid UUID must also belong to the foods allowed for this user
        if (!allowedIds.has(item.foodId)) {
          throw new AlimentoNaoPermitidoError(
            `Alimento não permitido: ${item.foodId}`,
          );
        }
      }
    }
  }
  return proposal;
}
