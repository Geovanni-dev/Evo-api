import type { Request, Response } from 'express'; // Import the Request and Response types from the Express library
import prisma from '../../prisma/prisma.js'; // Import the PrismaClient instance from the prisma.ts file
import { z } from 'zod'; // Import the zod library for schema validation
import {
  getActiveMealPlan,
  updateActiveMealPlan,
} from '../services/mealPlanService.js'; // Import the getMealPlan service function
import { generateMealPlan } from '../services/generateMealPlanService.js'; // Import the generateMealPlan service function
import { buildMealPlanRequestSchema } from '../schemas/mealPlanSchema.js'; // Import the mealPlanSchema for validation

//=============================mealplanController

// FUNCTION FOR GET ACTIVE MEAL PLAN
export const indexMealPlan = async (req: Request, res: Response) => {
  try {
    // Get the user ID from the request
    const userId =
      (req.headers['x-user-id'] as string) ||
      (process.env.DEFAULT_USER_ID as string); // Get the user ID from the request or use the default user ID
    if (!userId) {
      return res.status(401).json({ error: 'Id do usuário não fornecido' }); // Return a 401 status code if the user ID is not provided
    }
    // Get the meal plan from the database
    const result = await getActiveMealPlan(userId);
    return res.status(200).json(result); // Return the preferences with a 200 status code
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: 'Erro interno do servidor' }); // Return a generic error message with a 500 status code
  }
};

//FUNCTION FOR UPDATE/CREATE A MEAL PLAN
export const updateMealPlan = async (req: Request, res: Response) => {
  try {
    const userId =
      (req.headers['x-user-id'] as string) ||
      (process.env.DEFAULT_USER_ID as string); // Get the user ID from the request or use the default user ID
    if (!userId) {
      return res.status(401).json({ error: 'Id do usuário não fornecido' }); // Return a 401 status code if the user ID is not provided
    }
    const nutritionGoal = await prisma.userNutritionGoal.findUnique({
      where: { userId },
    });
    if (!nutritionGoal) {
      return res
        .status(404)
        .json({ error: 'Objetivo nutricional não encontrado' }); // Return a 404 status code if the nutrition goal is not found
    }
    const schema = buildMealPlanRequestSchema(nutritionGoal); // Get the meal plan schema

    const payload = schema.parse(req.body); // Validate the request body against the mealPlanSchema

    const result = await updateActiveMealPlan(userId, payload); // Update the meal plan in the database
    return res.status(200).json(result); // Return the preferences with a 200 status code
  } catch (error) {
    console.log(error);
    if (error instanceof z.ZodError) {
      console.error('ZodError:', JSON.stringify(error.issues, null, 2));
      return res.status(400).json({
        error: 'Dados da solicitação inválidos',
        details: error.issues,
      }); // Return a 400 status code with validation error details
    } else {
      return res.status(500).json({ error: 'Erro interno do servidor' }); // Return a generic error message with a 500 status code
    }
  }
};

export const storeMealPlan = async (req: Request, res: Response) => {
  try {
    const userId =
      (req.headers['x-user-id'] as string) ||
      (process.env.DEFAULT_USER_ID as string); // Get the user ID from the request or use the default user ID
    if (!userId) {
      return res.status(401).json({ error: 'Id do usuário não fornecido' }); // Return a 401 status code if the user ID is not provided
    }
    const { plan, targets, warnings } = await generateMealPlan(userId);
    const savedPlan = await updateActiveMealPlan(userId, {
      status: 'active',
      planJson: plan,
    });
    return res.status(200).json({ ...savedPlan, targets, warnings }); // Return the preferences with a 200 status code
  } catch (error) {
    console.log('Erro ao gerar dieta', error);
    if (error instanceof Error) {
      if (error.message === 'Chave de API do Gemini não fornecida no .env') {
        return res
          .status(400)
          .json({ error: 'Chave de API do Gemini não fornecida no .env' }); // Return a 400 status code
      }
      // Check if the error message contains "Meta nutricional"
      if (error.message.includes('Meta nutricional')) {
        return res.status(404).json({ error: error.message });
      }
      // Check if the error message contains "Preferências"
      if (error.message.includes('Preferências')) {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('JSON')) {
        return res
          .status(500)
          .json({ error: 'Erro ao processar resposta da IA' });
      }
    }
    return res.status(500).json({ error: 'Erro interno do servidor' }); // Return a generic error message
  }
};
