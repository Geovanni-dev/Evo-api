import prisma from '../../prisma/prisma.js'; // Import the PrismaClient instance from the prisma.ts file
import type {
  CreateMealPayload,
  UpdateMealPayload,
  DateSchemaType,
} from '../schemas/mealSchemas.js'; // Import the CreateMealPayload type from the mealSchemas.ts file
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
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
  const serverNow = new Date(); // Get the current date and time
  const userLocalDate = payload.localDate // Check if a localDate is provided
    ? (() => {
        const [year, month, day] = payload.localDate.split('-').map(Number) as [
          number,
          number,
          number,
        ];
        return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      })()
    : (() => {
        const d = new Date(serverNow);
        d.setUTCHours(0, 0, 0, 0);
        return d;
      })();

  const serverToday = new Date(serverNow); // Get the current date
  serverToday.setUTCHours(0, 0, 0, 0); // Set the hours, minutes, seconds, and milliseconds to 0

  const diffTime = userLocalDate.getTime() - serverToday.getTime(); // Calculate the difference in time
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); // Calculate the difference in days

  // Check if the difference in days is less than -2 or greater than 1
  if (diffDays < -2 || diffDays > 1) {
    throw new Error(
      'Data da refeição inválida. Fora da janela permitida (-2 a +1 dias).',
    );
  }

  return await prisma.$transaction(
    async (tx) => {
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
          mealType: payload.mealType || 'refeicao_livre', // Use the provided meal
          aiRawResponse: payload.aiRawResponse || {}, // Use the provided aiRawResponse or null if not provided
          createdAt: serverNow, //timestamp of creation
          date: userLocalDate, // user local date
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
            date: userLocalDate, // user local date
          },
        },
        update: {
          calories: { increment: totais.calories },
          protein: { increment: totais.protein },
          carbs: { increment: totais.carbs },
          fat: { increment: totais.fat },
        },
        create: {
          userId,
          date: userLocalDate,
          ...totais,
        },
      });
      // try for cache
      try {
        await deleteDailyCache(userId, userLocalDate); // Delete the meals data from the Redis cache
      } catch (error) {
        console.error('Erro ao deletar o cache:', error);
      }
      return meal; // Return the created meal
    },
    { timeout: 10000 },
  );
};

// FUNCTION FOR GET DAILY MEALS
export const getDailyMeals = async (userId: string, dateParams?: string) => {
  const serverNow = new Date(); // Get the current date and time
  const date = dateParams // Check if a date is provided
    ? (() => {
        const [year, month, day] = dateParams.split('-').map(Number) as [
          number,
          number,
          number,
        ];
        return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0)); // Set the hours, minutes, seconds, and milliseconds to 0
      })()
    : (() => {
        const d = new Date(serverNow);
        d.setUTCHours(0, 0, 0, 0);
        return d;
      })();

  const cached = await getDailyCache(userId, date); // Try to get the meals data from the Redis cache
  if (cached) {
    return cached; // Return the meals data from the cache
  }
  // Query the database for meals created by the user on the specified date, including related meal items
  const meals = await prisma.meal.findMany({
    where: {
      userId,
      date,
    },
    include: { items: true }, // Include the related meal items in the response
  });

  // Query the database for the daily summary of the user on the specified date
  const dailySummary = await prisma.dailySummary.findUnique({
    where: {
      userId_date: {
        userId,
        date,
      },
    },
  });
  // Query the database for the user's nutrition goal
  const nutritionGoal = await prisma.userNutritionGoal.findUnique({
    where: {
      userId,
    },
  });
  // Calculate the remaining nutrients based on the user's nutrition goal
  const remaining = nutritionGoal
    ? {
        calories:
          nutritionGoal.dailyCalorieTarget - (dailySummary?.calories || 0),
        protein: nutritionGoal.proteinTarget - (dailySummary?.protein || 0),
        carbs: nutritionGoal.carbsTarget - (dailySummary?.carbs || 0),
        fat: nutritionGoal.fatTarget - (dailySummary?.fat || 0),
      }
    : null;

  // Calculate the total calories for each meal
  const mealsSummary = meals.map((meal) => ({
    mealId: meal.id,
    mealType: meal.mealType,
    calories: meal.items.reduce((acc, item) => acc + item.calories, 0),
  }));
  // Return the meals data
  const result = {
    meals,
    mealsSummary,
    totals: dailySummary || {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    },
    tdee: nutritionGoal
      ? {
          calories: nutritionGoal.dailyCalorieTarget,
          protein: nutritionGoal.proteinTarget,
          carbs: nutritionGoal.carbsTarget,
          fat: nutritionGoal.fatTarget,
        }
      : null,
    remaining,
  };

  await setDailyCache(userId, date, result); // Set the meals data in the Redis cache

  return result; // Return the meals data
};

// FUNCTION FOR GET MEAL BY TYPE
export const getMealByType = async (
  mealType: string,
  userId: string,
  dateParams?: string,
) => {
  const serverNow = new Date(); // Get the current date and time
  const date = dateParams // Check if a date is provided
    ? (() => {
        const [year, month, day] = dateParams.split('-').map(Number) as [
          number,
          number,
          number,
        ];
        return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0)); // Set the hours, minutes, seconds, and milliseconds to 0
      })()
    : (() => {
        const d = new Date(serverNow);
        d.setUTCHours(0, 0, 0, 0);
        return d;
      })();
  const cached = await getDailyCache(userId, date); // Try to get the meals data from the Redis cache
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
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
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
      date,
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
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
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
  payload: UpdateMealPayload,
) => {
  const { updatedMeal, newTotal, date } = await prisma.$transaction(
    async (tx) => {
      const locked = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Meal" WHERE id = ${mealId} AND "userId" = ${userId} FOR UPDATE
  `;
      if (locked.length === 0) {
        throw new Error('Refeição não encontrada');
      }

      // Query the database for the meal to be updated
      const meal = await tx.meal.findFirst({
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
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      );
      // Calculate the new total
      const newTotal = payload.items.reduce(
        (acc, item) => ({
          calories: acc.calories + item.calories,
          protein: acc.protein + item.protein,
          carbs: acc.carbs + item.carbs,
          fat: acc.fat + item.fat,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      );
      // Calculate the difference
      const difference = {
        calories: newTotal.calories - oldTotal.calories,
        protein: newTotal.protein - oldTotal.protein,
        carbs: newTotal.carbs - oldTotal.carbs,
        fat: newTotal.fat - oldTotal.fat,
      }; // Calculate the difference between the old and new totals

      const date = meal.date; // Get the date of the meal

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
        },
      });

      const updatedMeal = await tx.meal.findFirst({
        where: {
          id: mealId,
          userId,
        },
        include: { items: true }, // Include the related meal items in the response
      });

      return { updatedMeal, newTotal, date }; // Return the updated meal
    },
    { timeout: 10000 }, // Set the transaction timeout to 10 seconds
  );

  // try for cache
  try {
    await deleteDailyCache(userId, date); // Delete the meals data from the Redis cache
  } catch (error) {
    console.error('Erro ao deletar o cache:', error);
  }
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
    throw new Error('Refeição não encontrada');
  }

  // Calculate the total
  const total = meal.items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fat: acc.fat + item.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const date = meal.date; // Get the date of the meal

  await prisma.$transaction(
    async (tx) => {
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
          calories: { decrement: total.calories },
          protein: { decrement: total.protein },
          carbs: { decrement: total.carbs },
          fat: { decrement: total.fat },
        },
      });
    },
    { timeout: 10000 },
  );

  // try for cache
  try {
    await deleteDailyCache(userId, date); // Delete the meals data from the Redis cache
  } catch (error) {
    console.error('Erro ao deletar o cache:', error);
  }
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
  };

  const date = item.meal.date; // Get the date of the meal

  await prisma.$transaction(
    async (tx) => {
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
        },
      });
    },
    { timeout: 10000 },
  );

  // try for cache
  try {
    await deleteDailyCache(userId, date); // Delete the meals data from the Redis cache
  } catch (error) {
    console.error('Erro ao deletar o cache:', error);
  }
  return { message: 'Item deletado com sucesso', item }; // Return the deleted item
};

// FUNCTION FOR GET MEAL SUMMARY
export const getMealSummary = async (userId: string, date: DateSchemaType) => {
  const { from, to } = date; // Get the from and to dates
  // Query the database for meals created by the user within the specified date range
  const summary = await prisma.meal.findMany({
    where: {
      userId,
      date: {
        // Get the meals created between the from and to dates
        gte: new Date(from),
        lte: new Date(to),
      },
    },
    include: { items: true },
  });
  const grouped: Record<
    string,
    { mealId: string; mealType: string; calories: number }[]
  > = {}; // Create an empty object to store the grouped meals
  for (const meal of summary) {
    const key = meal.date.toISOString().slice(0, 10); // Get the date of the meal
    if (!grouped[key]) {
      grouped[key] = []; // If the date is not in the grouped object, create an empty array
    }
    // Add the meal to the group
    grouped[key].push({
      mealId: meal.id,
      mealType: meal.mealType,
      calories: meal.items.reduce((acc, item) => acc + item.calories, 0),
    });
  }
  return grouped;
};
