import type { Request, Response } from 'express'; // Import the Request and Response types from the Express library
import { z } from 'zod'; // Import the zod library for schema validation
import nutritionGoalSchema from '../schemas/nutritionGoalsSchemas.js'; // Import the nutritionGoalSchema for validation
import {
  nutritionGoal,
  getNutritionGoal,
} from '../service/nutritionGoalsService.js'; // Import the nutritionGoal service function

//================== nurtritionGoalConrtoller

// FUNCTION FOR CREATE OR UPDATE A NUTRITION GOAL
export const update = async (req: Request, res: Response) => {
  try {
    const payload = nutritionGoalSchema.parse(req.body); // Validate the request body against the nutritionGoalSchema
    const userId =
      (req.headers['x-user-id'] as string) ||
      (process.env.DEFAULT_USER_ID as string); // Get the user ID from the request or use the default user ID
    if (!userId) {
      return res.status(401).json({ error: 'Id do usuário não fornecido' }); // Return a 401 status code if the user ID is not provided
    }
    const result = await nutritionGoal(userId, payload);
    return res.status(200).json(result); // Return the created or updated nutrition goal with a 200 status code
  } catch (error) {
    console.log(error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Dados de solicitação inválidos',
        details: error.issues,
      }); // Return a 400 status code with validation error details
    } else if (
      error instanceof Error &&
      error.message === 'Usuário não encontrado'
    ) {
      return res.status(404).json({ error: 'Usuário não encontrado' }); // Return a 404 status code if the user is not found
    }
    return res.status(500).json({ error: 'Erro interno do servidor' }); // Return a generic error message with a 500 status code
  }
};

// FUNCTION FOR GET A NUTRITION GOAL
export const index = async (req: Request, res: Response) => {
  try {
    const userId =
      (req.headers['x-user-id'] as string) ||
      (process.env.DEFAULT_USER_ID as string); // Get the user ID from the request or use the default user ID
    if (!userId) {
      return res.status(401).json({ error: 'Id do usuário não fornecido' }); // Return a 401 status code if the user ID is not provided
    }
    const result = await getNutritionGoal(userId);
    return res.status(200).json(result); // Return the nutrition goal with a 200 status code
  } catch (error) {
    console.log(error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Dados de solicitação inválidos',
        details: error.issues,
      }); // Return a 400 status code with validation error details
    } else if (
      error instanceof Error &&
      error.message === 'Usuário nao encontrado'
    ) {
      return res.status(404).json({ error: 'Usuário nao encontrado' }); // Return a 404 status code if the user is not found
    }
    return res.status(500).json({ error: 'Erro interno do servidor' }); // Return a generic error message with a 500 status code
  }
};
