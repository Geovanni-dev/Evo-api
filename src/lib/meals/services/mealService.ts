import prisma from '../../prisma.js'; // Import the PrismaClient instance from the prisma.ts file
import type { CreateMealPayload } from '../schemas/mealSchemas.js'; // Import the CreateMealPayload type from the mealSchemas.ts file

//============================== mealService

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
