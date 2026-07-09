import prisma from '../../lib/prisma/prisma.js'; // import the PrismaClient instance
import type { NutritionGoalPayload } from '../schemas/nutritionGoalsSchemas.js'; // import the NutritionGoalPayload type

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
  return result; // Return the created or updated nutrition goal
};

// FUNCTION FOR GET A NUTRITION GOAL
export const getNutritionGoal = async (userId: string) => {
  const result = await prisma.userNutritionGoal.findUnique({
    where: {
      userId,
    },
  });
  return result; // Return the nutrition goal
};

export default {
  nutritionGoal,
  getNutritionGoal,
};
