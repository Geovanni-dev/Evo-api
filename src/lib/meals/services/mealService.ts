import prisma from '../../prisma.js'; // Import the PrismaClient instance from the prisma.ts file
import type { CreateMealPayload } from '../schemas/mealSchemas.js'; // Import the CreateMealPayload type from the mealSchemas.ts file

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
    const meal = await tx.meal.create({
      data: {
        userId, // Convert the userId to a string before storing it in the database
        mealType: payload.mealType || 'livre', // Use the provided meal
        aiRawResponse: payload.aiRawResponse || {}, // Use the provided aiRawResponse or null if not provided
        createdAt: date, // Use the current date and time as the default value for the createdAt field
      },
      include: { items: true }, // Include the related meal items in the response
    });

    await tx.mealItem.createMany({
      data: payload.items.map((item) => ({
        ...item,
        mealId: meal.id,
      })),
    });

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

    return meal;
  });
};

// FUNCTION FOR GET DAILY MEALS
export const getDailyMeals = async (userId: string, date: Date) => {
  const start = new Date(date); // Create a new Date object for the start of the day
  const end = new Date(date); // Create a new Date object for the end of the day
  end.setHours(23, 59, 59, 999);
  start.setHours(0, 0, 0, 0);
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
  /*if (!nutritionGoal) {
    throw new Error('TDEE do usuário não encontrado');
  }*/

  return {
    meals,
    totals: dailySummary || {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
    },
    tdee: nutritionGoal?.dailyCalorieTarget ?? null,
  };
};

// FUNCTION FOR GET MEAL BY TYPE
export const getMealByType = async (mealType: string, userId: string) => {
  const start = new Date(); // Create a new Date object for the start of the day
  const end = new Date();
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
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

  const difference = {
    calories: newTotal.calories - oldTotal.calories,
    protein: newTotal.protein - oldTotal.protein,
    carbs: newTotal.carbs - oldTotal.carbs,
    fat: newTotal.fat - oldTotal.fat,
    fiber: newTotal.fiber - oldTotal.fiber,
  }; // Calculate the difference between the old and new totals

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
    // Update the daily summary
    const date = meal.createdAt;

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

  return {
    meal: updatedMeal,
    total: newTotal,
  };
};

export default {
  createMeal,
  getDailyMeals,
  getMealByType,
  updateMeal,
};
