import type { Request, Response } from 'express'; // Import the Request and Response types from the Express library
import mealSchema from '../schemas/mealSchemas.js'; // Import the mealSchema for validation
import {
  createMeal,
  getDailyMeals,
  getMealByType,
  updateMeal,
  deleteMeal,
  deleteItem,
} from '../services/mealService.js'; // Import the createMeal service function
import { z } from 'zod'; // Import the zod library for schema validation

//============================== mealsControllers

// FUNCTION FOR REGISTER A MEAL
export const store = async (req: Request, res: Response) => {
  try {
    const payload = mealSchema.parse(req.body); // Validate the request body against the mealSchema
    const userId =
      (req.headers['x-user-id'] as string) ||
      (process.env.DEFAULT_USER_ID as string); // Get the user ID from the request or use the default user ID
    if (!userId) {
      return res.status(401).json({ error: 'Id do usuário não fornecido' }); // Return a 401 status code if the user ID is not provided
    }
    const meal = await createMeal(payload, userId);
    return res.status(201).json(meal); // Return the created meal with a 201 status code
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Dados da solicitação inválidos',
        details: error.issues,
      }); // Return a 400 status code with validation error details
    } else {
      return res.status(500).json({ error: 'Erro interno do servidor' }); // Return a generic error message with a 500 status code
    }
  }
};

// FUNCTION FOR GET ALL MEALS
export const index = async (req: Request, res: Response) => {
  try {
    const userId =
      (req.headers['x-user-id'] as string) ||
      (process.env.DEFAULT_USER_ID as string); // Get the user ID from the request or use the default user ID
    if (!userId) {
      return res.status(401).json({ error: 'Id do usuário não fornecido' }); // Return a 401 status code if the user ID is not provided
    }
    const result = await getDailyMeals(userId, new Date()); // Call the getDailyMeals service function to retrieve the meals for the user
    return res.status(200).json(result); // Return the retrieved meals with a 200 status code
  } catch (error) {
    console.log(error);
    if (
      error instanceof Error &&
      error.message === 'TDEE do usuário nao encontrado'
    ) {
      return res.status(404).json({ error: 'TDEE do usuário não encontrado' }); // Return a 404 status code if the user's TDEE is not found
    } else {
      return res.status(500).json({ error: 'Erro interno do servidor' }); // Return a generic error message with a 500 status code
    }
  }
};

// FUNCTION FOR GET A MEAL
export const show = async (req: Request, res: Response) => {
  try {
    const userId =
      (req.headers['x-user-id'] as string) ||
      (process.env.DEFAULT_USER_ID as string); // Get the user ID from the request or use the default user ID
    if (!userId) {
      return res.status(401).json({ error: ' Id do usuário não fornecido' }); // Return a 401 status code if the user ID is not provided
    }
    const { mealType } = req.params;
    if (!mealType) {
      return res.status(400).json({ error: 'Tipo de refeição nao fornecido' }); // Return a 400 status code if the mealType is not provided
    }
    if (typeof mealType !== 'string') {
      return res
        .status(400)
        .json({ error: 'Tipo de refeição deve ser uma string' }); // Return a 400 status code if the mealType is not a string
    }
    const result = await getMealByType(mealType, userId);
    if (!result) {
      return res.status(404).json({ error: 'Refeição não encontrada' }); // Return a 404 status code if the meal is not found
    }
    return res.status(200).json(result); // Return the retrieved meal with a 200 status code
  } catch (error) {
    console.log(error);
    if (error instanceof Error && error.message === 'Refeição não encontrada') {
      return res.status(404).json({ error: 'Refeição não encontrada' }); // Return a 404 status code if the meal is not found
    } else {
      return res.status(500).json({ error: 'Erro interno do servidor' }); // Return a generic error message with a 500 status code
    }
  }
};
// FUNCTION FOR UPDATE A MEAL
export const update = async (req: Request, res: Response) => {
  try {
    const payload = mealSchema.parse(req.body); // Validate the request body against the mealSchema
    const userId =
      (req.headers['x-user-id'] as string) ||
      (process.env.DEFAULT_USER_ID as string); // Get the user ID from the request or use the default user ID
    if (!userId) {
      return res.status(401).json({ error: 'Id do usuário não fornecido' }); // Return a 401 status code if the user ID is not provided
    }
    const { mealId } = req.params;
    if (!mealId) {
      return res.status(400).json({ error: 'Id da refeição nao fornecido' }); // Return a 400 status code if the mealId is not provided
    }
    if (typeof mealId !== 'string') {
      return res
        .status(400)
        .json({ error: 'Id da refeição deve ser uma string' }); // Return a 400 status code if the mealId is not a string
    }
    const result = await updateMeal(mealId, userId, payload);
    return res.status(200).json(result); // Return the updated meal with a 200 status code
  } catch (error) {
    console.log(error);
    if (error instanceof Error && error.message === 'Refeição não encontrada') {
      return res.status(404).json({ error: 'Refeição não encontrada' }); // Return a 404 status code if the meal is not found
    } else {
      return res.status(500).json({ error: 'Erro interno do servidor' }); // Return a generic error message with a 500 status code
    }
  }
};
// FUNCTION FOR DELETE A MEAL
export const destroy = async (req: Request, res: Response) => {
  try {
    const userId =
      (req.headers['x-user-id'] as string) ||
      (process.env.DEFAULT_USER_ID as string); // Get the user ID from the request or use the default user ID
    if (!userId) {
      return res.status(401).json({ error: 'Id do usuário não fornecido' }); // Return a 401 status code if the user ID is not provided
    }
    const { mealId } = req.params; // Get the meal ID from the request parameters
    if (!mealId) {
      return res.status(400).json({ error: 'Id da refeição não fornecido' }); // Return a 400 status code if the mealId is not provided
    }
    if (typeof mealId !== 'string') {
      return res
        .status(400)
        .json({ error: 'Id da refeição deve ser uma string' }); // Return a 400 status code if the mealId is not a string
    }
    const result = await deleteMeal(mealId, userId);
    return res.status(200).json(result); // Return the deleted meal with a 200 status code
  } catch (error) {
    console.log(error);
    if (error instanceof Error && error.message === 'Refeição não encontrada') {
      return res.status(404).json({ error: 'Refeição não encontrada' }); // Return a 404 status code if the meal is not found
    } else {
      return res.status(500).json({ error: 'Erro interno do servidor' }); // Return a generic error message with a 500 status code
    }
  }
};
// FUNCTION FOR DELETE A MEAL ITEM
export const destroyItem = async (req: Request, res: Response) => {
  try {
    const userId =
      (req.headers['x-user-id'] as string) ||
      (process.env.DEFAULT_USER_ID as string); // Get the user ID from the request or use the default user ID
    if (!userId) {
      return res.status(401).json({ error: 'Id do usuário não fornecido' }); // Return a 401 status code if the user ID is not provided
    }
    const { mealId, itemId } = req.params; // Get the meal ID and item ID from the request parameters
    if (!mealId) {
      return res.status(400).json({ error: 'Id da refeição nao fornecido' }); // Return a 400 status code if the mealId is not provided
    }
    if (typeof mealId !== 'string') {
      return res
        .status(400)
        .json({ error: 'Id da refeição deve ser uma string' }); // Return a 400 status code if the mealId is not a string
    }
    if (!itemId) {
      return res.status(400).json({ error: 'Id do item não fornecido' }); // Return a 400 status code if the itemId is not provided
    }
    if (typeof itemId !== 'string') {
      return res.status(400).json({ error: 'Id do item deve ser uma string' }); // Return a 400 status code if the itemId is not a string
    }
    const result = await deleteItem(mealId, itemId, userId);
    return res.status(200).json(result); // Return the deleted item with a 200 status code
  } catch (error) {
    console.log(error);
    if (error instanceof Error && error.message === 'Item não encontrado') {
      return res.status(404).json({ error: 'Item não encontrado' }); // Return a 404 status code if the item is not found
    } else {
      return res.status(500).json({ error: 'Erro interno do servidor' }); // Return a generic error message with a 500 status code
    }
  }
};

export default {
  store,
  index,
  show,
  update,
  destroy,
  destroyItem,
};
