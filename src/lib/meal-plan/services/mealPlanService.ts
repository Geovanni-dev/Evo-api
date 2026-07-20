import prisma from '../../prisma/prisma.js'; // Import the PrismaClient instance from the prisma.ts file
import {
  setMealPlanCache,
  getMealPlanCache,
  deleteMealPlanCache,
} from './mealPlanCache.js'; // Import the setDailyCache, getDailyCache, and deleteDailyCache functions
