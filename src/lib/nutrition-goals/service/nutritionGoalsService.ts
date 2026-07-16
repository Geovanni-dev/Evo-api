import prisma from '../../prisma/prisma.js'; // import the PrismaClient instance
import type { NutritionGoalPayload } from '../schemas/nutritionGoalsSchemas.js'; // import the NutritionGoalPayload type
import {
  setNutritionGoalCache,
  getNutritionGoalCache,
  deleteNutritionGoalCache,
} from './goalCache.js'; // Import the setDailyCache, getDailyCache, and deleteDailyCache functions
import { deleteDailyCache } from '../../meals/services/mealCache.js';

//============================== nutritionGoalService

// FUNCTION FOR CREATE OR UPDATE A NUTRITION GOAL
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
  // Create or update the user's nutrition goal
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
  // Set the nutrition goal data in the Redis cache
  if (result) {
    await deleteNutritionGoalCache(userId);
    await deleteDailyCache(userId, new Date());
  }

  return result; // Return the created or updated nutrition goal
};

// FUNCTION FOR GET A NUTRITION GOAL
export const getNutritionGoal = async (userId: string) => {
  const cached = await getNutritionGoalCache(userId); // Try to get the meals data from the Redis cache
  if (cached) {
    return cached;
  }
  const result = await prisma.userNutritionGoal.findUnique({
    where: {
      userId,
    },
  });

  // Set the nutrition goal data in the Redis cache
  if (result) {
    await setNutritionGoalCache(userId, result); // Set the nutrition goal data in the Redis cache
  }

  return result; // Return the nutrition goal
};
