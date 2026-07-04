import type { Request, Response } from 'express'; // Import the Request and Response types from the Express library
import mealSchema from '../schemas/mealSchemas.js'; // Import the mealSchema for validation
import { createMeal } from '../services/mealService.js'; // Import the createMeal service function
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
      return res.status(401).json({ error: ' Id do usuário não fornecido' }); // Return a 401 status code if the user ID is not provided
    }
    const meal = await createMeal(payload, userId);
    return res.status(201).json(meal); // Return the created meal with a 201 status code
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: 'Invalid request data', details: error.issues }); // Return a 400 status code with validation error details
    } else {
      return res.status(500).json({ error: 'Internal server error' }); // Return a generic error message with a 500 status code
    }
  }
};

export const index = async (req: Request, res: Response) => {};

export const show = async (req: Request, res: Response) => {};

export const update = async (req: Request, res: Response) => {};

export const destroy = async (req: Request, res: Response) => {};

export default {
  store,
  index,
  show,
  update,
  destroy,
};
