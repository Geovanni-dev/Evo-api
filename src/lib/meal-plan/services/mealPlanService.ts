import prisma from '../../prisma/prisma.js'; // Import the PrismaClient instance from the prisma.ts file
import { type MealPlanRequestPayload } from '../schemas/mealPlanSchema.js';
import {
  setMealPlanCache,
  getMealPlanCache,
  deleteMealPlanCache,
} from './mealPlanCache.js'; // Import the setDailyCache, getDailyCache, and deleteDailyCache functions
import type { MealPlanCacheDate } from './mealPlanCache.js';

//============================== mealPlanService

// FUNCTION FOR GET ACTIVE MEAL PLAN
export const getActiveMealPlan = async (
  userId: string,
): Promise<MealPlanCacheDate | null> => {
  const cached = await getMealPlanCache(userId); // Try to get the meals data from the Redis cache
  if (cached) {
    return cached;
  }
  const record = await prisma.mealPlan.findFirst({
    where: {
      userId,
      status: 'active',
    },
  });
  if (!record) return null; // Return null if the record is not found

  // Set the meals data in the Redis cache
  const cacheData: MealPlanCacheDate = {
    id: record.id,
    userId: record.userId,
    planJson: record.planJson as Record<string, unknown>,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
  await setMealPlanCache(userId, cacheData); // Set the meals data in the Redis cache
  return cacheData;
};

// FUNCITIOM FOR UPDATE A ACTIVE MEAL PLAN
export const updateActiveMealPlan = async (
  userId: string,
  payload: MealPlanRequestPayload,
): Promise<MealPlanCacheDate> => {
  const record = await prisma.mealPlan.upsert({
    where: {
      userId,
    },
    update: {
      status: payload.status,
      ...(payload.status === 'active' && { planJson: payload.planJson }), // Update the planJson if the status is 'active'
    },

    create: {
      userId,
      planJson: payload.status === 'active' ? payload.planJson : {},
      status: payload.status,
    },
  });

  await deleteMealPlanCache(userId); // Delete the meals data from the Redis cache

  // Set the meals data in the Redis cache
  const cacheData: MealPlanCacheDate = {
    id: record.id,
    userId: record.userId,
    planJson: record.planJson as Record<string, unknown>,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
  await setMealPlanCache(userId, cacheData); // Set the meals data in the Redis cache
  return cacheData;
};
