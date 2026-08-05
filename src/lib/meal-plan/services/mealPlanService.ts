import prisma from '../../prisma/prisma.js';
import { type MealPlanRequestPayload } from '../schemas/mealPlanSchema.js';
import {
  setMealPlanCache,
  getMealPlanCache,
  deleteMealPlanCache,
} from './mealPlanCache.js';
import type { MealPlanCacheDate } from './mealPlanCache.js';

//============================== mealPlanService

export const getActiveMealPlan = async (
  userId: string,
): Promise<MealPlanCacheDate | null> => {
  const cached = await getMealPlanCache(userId);
  if (cached) {
    return cached;
  }
  const record = await prisma.mealPlan.findFirst({
    where: {
      userId,
      status: 'active',
    },
  });
  if (!record) return null;

  const cacheData: MealPlanCacheDate = {
    id: record.id,
    userId: record.userId,
    planJson: record.planJson as Record<string, unknown>,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
  await setMealPlanCache(userId, cacheData);
  return cacheData;
};

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
      ...(payload.status === 'active' && { planJson: payload.planJson }),
    },

    create: {
      userId,
      planJson: payload.status === 'active' ? payload.planJson : {},
      status: payload.status,
    },
  });

  await deleteMealPlanCache(userId);

  const cacheData: MealPlanCacheDate = {
    id: record.id,
    userId: record.userId,
    planJson: record.planJson as Record<string, unknown>,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
  await setMealPlanCache(userId, cacheData);
  return cacheData;
};
