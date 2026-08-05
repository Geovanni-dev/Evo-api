import prisma from '../../prisma/prisma.js';
import type { NutritionGoalPayload } from '../schemas/nutritionGoalsSchemas.js';
import {
  setNutritionGoalCache,
  getNutritionGoalCache,
  deleteNutritionGoalCache,
} from './goalCache.js';
import { deleteDailyCache } from '../../meals/services/mealCache.js';

//============================== nutritionGoalService

export const nutritionGoal = async (
  userId: string,
  payload: NutritionGoalPayload,
) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });
  if (!user) {
    throw new Error('Usuário não encontrado');
  }
  const result = await prisma.userNutritionGoal.upsert({
    where: {
      userId,
    },
    update: {
      ...payload,
    },
    create: {
      ...payload,
      userId,
    },
  });
  if (result) {
    await deleteNutritionGoalCache(userId);
    await deleteDailyCache(userId, new Date());
  }

  return result;
};

export const getNutritionGoal = async (userId: string) => {
  const cached = await getNutritionGoalCache(userId);
  if (cached) {
    return cached;
  }
  const result = await prisma.userNutritionGoal.findUnique({
    where: {
      userId,
    },
  });

  if (result) {
    await setNutritionGoalCache(userId, result);
  }

  return result;
};
