import prisma from '../../prisma/prisma.js'; // Import the PrismaClient instance from the prisma.ts file
import type { CreateMealPayload } from '../schemas/mealSchemas.js'; // Import the CreateMealPayload type from the mealSchemas.ts file
import { setDailyCache, getDailyCache, deleteDailyCache } from './mealCache.js'; // Import the setDailyCache, getDailyCache, and deleteDailyCache functions

//============================== mealService

// FUNCTION FOR CREATE A MEAL
export const createMeal = async (
  payload: CreateMealPayload,
  userId: string,
) => {
  const totais = payload.items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fat: acc.fat + item.fat,
      fiber: acc.fiber + item.fiber,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );
  const date = new Date(); // Use the current date and time as the default value for the date field

  return await prisma.$transaction(async (tx) => {
    const tdee = await tx.userNutritionGoal.findUnique({
      where: {
        userId,
      },
    });
    if (!tdee) {
      throw new Error('TDEE não encontrado'); // Throw an error if the user's TDEE is not found
    }
    // Create the meal
    const meal = await tx.meal.create({
      data: {
        userId, // Convert the userId to a string before storing it in the database
        mealType: payload.mealType || 'livre', // Use the provided meal
        aiRawResponse: payload.aiRawResponse || {}, // Use the provided aiRawResponse or null if not provided
        createdAt: date, // Use the current date and time as the default value for the createdAt field
      },
      include: { items: true }, // Include the related meal items in the response
    });
    // Create the meal items
    await tx.mealItem.createMany({
      data: payload.items.map((item) => ({
        ...item,
        mealId: meal.id,
      })),
    });
    // Update the daily summary
    await tx.dailySummary.upsert({
      where: {
        userId_date: {
          userId,
          date,
        },
      },
      update: {
        calories: { increment: totais.calories },
        protein: { increment: totais.protein },
        carbs: { increment: totais.carbs },
        fat: { increment: totais.fat },
        fiber: { increment: totais.fiber },
      },
      create: {
        userId,
        date,
        ...totais,
      },
    });

    await deleteDailyCache(userId, date); // Delete the meals data from the Redis cache

    return meal; // Return the created meal
  });
};

// FUNCTION FOR GET DAILY MEALS
export const getDailyMeals = async (userId: string, date: Date) => {
  const start = new Date(date); // Create a new Date object for the start of the day
  const end = new Date(date); // Create a new Date object for the end of the day
  end.setHours(23, 59, 59, 999);
  start.setHours(0, 0, 0, 0);

  const cached = await getDailyCache(userId, date); // Try to get the meals data from the Redis cache
  if (cached) {
    return cached; // Return the meals data from the cache
  }
  // Query the database for meals created by the user on the specified date, including related meal items
  const meals = await prisma.meal.findMany({
    where: {
      userId,
      createdAt: {
        gte: start,
        lt: end,
      },
    },
    include: { items: true }, // Include the related meal items in the response
  });

  // Query the database for the daily summary of the user on the specified date
  const dailySummary = await prisma.dailySummary.findUnique({
    where: {
      userId_date: {
        userId,
        date: start,
      },
    },
  });
  // Query the database for the user's nutrition goal
  const nutritionGoal = await prisma.userNutritionGoal.findUnique({
    where: {
      userId,
    },
  });
  if (!nutritionGoal) {
    throw new Error('TDEE do usuário não encontrado');
  }

  // Calculate the remaining nutrients
  const remaining = {
    calories: nutritionGoal.dailyCalorieTarget - (dailySummary?.calories || 0),
    protein: nutritionGoal.proteinTarget - (dailySummary?.protein || 0),
    carbs: nutritionGoal.carbsTarget - (dailySummary?.carbs || 0),
    fat: nutritionGoal.fatTarget - (dailySummary?.fat || 0),
  };

  // Return the meals data
  const result = {
    meals,
    totals: dailySummary || {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
    },
    tdee: {
      calories: nutritionGoal.dailyCalorieTarget,
      protein: nutritionGoal.proteinTarget,
      carbs: nutritionGoal.carbsTarget,
      fat: nutritionGoal.fatTarget,
    },
    remaining, // Return the remaining nutrients
  };

  await setDailyCache(userId, date, result); // Set the meals data in the Redis cache

  return result; // Return the meals data
};

// FUNCTION FOR GET MEAL BY TYPE
export const getMealByType = async (mealType: string, userId: string) => {
  const start = new Date(); // Create a new Date object for the start of the day
  const end = new Date();
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  const cached = await getDailyCache(userId, start); // Try to get the meals data from the Redis cache
  if (cached) {
    const mealFound = cached.meals.find((m) => m.mealType === mealType);
    if (!mealFound) {
      throw new Error('Refeição não encontrada');
    }
    const total = mealFound.items.reduce(
      (acc, item) => ({
        calories: acc.calories + item.calories,
        protein: acc.protein + item.protein,
        carbs: acc.carbs + item.carbs,
        fat: acc.fat + item.fat,
        fiber: acc.fiber + item.fiber,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
    );
    return {
      meal: mealFound,
      total,
    };
  }

  const meal = await prisma.meal.findFirst({
    where: {
      mealType,
      userId,
      createdAt: {
        gte: start,
        lt: end,
      },
    },
    include: { items: true }, // Include the related meal items in the response
  });

  if (!meal) {
    throw new Error('Refeição não encontrada');
  }
  const total = meal.items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fat: acc.fat + item.fat,
      fiber: acc.fiber + item.fiber,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );

  return {
    meal,
    total,
  };
};

// FUNCTION FOR UPDATE A MEAL
export const updateMeal = async (
  mealId: string,
  userId: string,
  payload: CreateMealPayload,
) => {
  // Query the database for the meal to be updated
  const meal = await prisma.meal.findFirst({
    where: {
      id: mealId,
      userId,
    },
    include: { items: true }, // Include the related meal items in the response
  });

  if (!meal) {
    throw new Error('Refeição não encontrada');
  }
  // Calculate the difference between the old and new totals
  const oldTotal = meal.items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fat: acc.fat + item.fat,
      fiber: acc.fiber + item.fiber,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );
  // Calculate the new total
  const newTotal = payload.items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fat: acc.fat + item.fat,
      fiber: acc.fiber + item.fiber,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );
  // Calculate the difference
  const difference = {
    calories: newTotal.calories - oldTotal.calories,
    protein: newTotal.protein - oldTotal.protein,
    carbs: newTotal.carbs - oldTotal.carbs,
    fat: newTotal.fat - oldTotal.fat,
    fiber: newTotal.fiber - oldTotal.fiber,
  }; // Calculate the difference between the old and new totals

  const date = meal.createdAt; // Use the current date and time as the default value for the date field

  // Update the meal
  await prisma.$transaction(async (tx) => {
    await tx.meal.update({
      where: { id: mealId },
      data: {
        mealType: payload.mealType || meal.mealType,
      },
    });
    await tx.mealItem.deleteMany({
      where: {
        mealId,
      },
    });

    await tx.mealItem.createMany({
      data: payload.items.map((item) => ({
        ...item,
        mealId,
      })),
    });

    await tx.dailySummary.update({
      where: { userId_date: { userId, date } },
      data: {
        calories: { increment: difference.calories },
        protein: { increment: difference.protein },
        carbs: { increment: difference.carbs },
        fat: { increment: difference.fat },
        fiber: { increment: difference.fiber },
      },
    });
  });

  const updatedMeal = await prisma.meal.findFirst({
    where: {
      id: mealId,
      userId,
    },
    include: { items: true }, // Include the related meal items in the response
  });

  await deleteDailyCache(userId, date); // Delete the meals data from the Redis cache

  return {
    meal: updatedMeal,
    total: newTotal,
  };
};

// FUNCTION FOR DELETE A MEAL
export const deleteMeal = async (mealId: string, userId: string) => {
  const meal = await prisma.meal.findFirst({
    where: {
      id: mealId,
      userId,
    },
    include: { items: true }, // Include the related meal items in the response
  });
  if (!meal) {
    throw new Error('Refeição nao encontrada');
  }

  // Calculate the total
  const total = meal.items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fat: acc.fat + item.fat,
      fiber: acc.fiber + item.fiber,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );

  const date = meal.createdAt;

  await prisma.$transaction(async (tx) => {
    await tx.mealItem.deleteMany({
      where: {
        mealId,
      },
    });
    await tx.meal.delete({
      where: {
        id: mealId,
      },
    });
    await tx.dailySummary.update({
      where: { userId_date: { userId, date } },
      data: {
        calories: {
          decrement: meal.items.reduce((acc, item) => acc + item.calories, 0),
        },
        protein: {
          decrement: meal.items.reduce((acc, item) => acc + item.protein, 0),
        },
        carbs: {
          decrement: meal.items.reduce((acc, item) => acc + item.carbs, 0),
        },
        fat: { decrement: meal.items.reduce((acc, item) => acc + item.fat, 0) },
        fiber: {
          decrement: meal.items.reduce((acc, item) => acc + item.fiber, 0),
        },
      },
    });
  });

  await deleteDailyCache(userId, date); // Delete the meals data from the Redis cache

  return { message: 'Refeição deletada com sucesso', total }; // Return the deleted meal
};

// FUNCTION FOR DELETE A MEAL ITEM
export const deleteItem = async (
  mealId: string,
  itemId: string,
  userId: string,
) => {
  const item = await prisma.mealItem.findFirst({
    where: {
      id: itemId,
      mealId,
      meal: {
        userId,
      },
    },
    include: {
      meal: true,
    },
  });
  if (!item) {
    throw new Error('Item não encontrado');
  }

  const itemTotal = {
    calories: item.calories,
    protein: item.protein,
    carbs: item.carbs,
    fat: item.fat,
    fiber: item.fiber,
  };

  const date = item.meal.createdAt; // Get the date of the meal

  await prisma.$transaction(async (tx) => {
    await tx.mealItem.delete({
      where: {
        id: itemId,
      },
    });
    // Update the daily summary
    await tx.dailySummary.update({
      where: { userId_date: { userId, date } },
      data: {
        calories: { decrement: itemTotal.calories },
        protein: { decrement: itemTotal.protein },
        carbs: { decrement: itemTotal.carbs },
        fat: { decrement: itemTotal.fat },
        fiber: { decrement: itemTotal.fiber },
      },
    });
  });

  await deleteDailyCache(userId, date); // Delete the meals data from the Redis cache

  return { message: 'Item deletado com sucesso', item }; // Return the deleted item
};
