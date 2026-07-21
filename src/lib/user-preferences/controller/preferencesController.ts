import type { Request, Response } from 'express'; // Import the Request and Response types from the Express library
import {
  PreferenceSchema,
  RestrictionSchema,
} from '../schemas/preferencesSchema.js'; // Import the preferencesSchema for validation
import {
  getPreferences,
  updatePreferences,
  getRestrictions,
  updateRestrictions,
} from '../services/preferencesService.js'; // Import the getPreferences service function
import { z } from 'zod'; // Import the zod library for schema validation

//========================================= preferences controller

// FUNCTION FOR GET ALL PREFERENCES
export const indexPref = async (req: Request, res: Response) => {
  try {
    const userId =
      (req.headers['x-user-id'] as string) ||
      (process.env.DEFAULT_USER_ID as string); // Get the user ID from the request or use the default user ID
    if (!userId) {
      return res.status(401).json({ error: 'Id do usuário não fornecido' }); // Return a 401 status code if the user ID is not provided
    }
    const result = await getPreferences(userId);
    return res.status(200).json(result); // Return the preferences with a 200 status code
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: 'Erro interno do servidor' }); // Return a generic error message with a 500 status code
  }
};

// FUNCTION FOR UPDATE PREFERENCES
export const updatePref = async (req: Request, res: Response) => {
  try {
    const payload = PreferenceSchema.parse(req.body); // Validate the request body against the preferencesSchema
    const userId =
      (req.headers['x-user-id'] as string) ||
      (process.env.DEFAULT_USER_ID as string); // Get the user ID from the request or use the default user ID
    if (!userId) {
      return res.status(401).json({ error: 'Id do usuário não fornecido' }); // Return a 401 status code if the user ID is not provided
    }
    const result = await updatePreferences(userId, payload);
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

//=================================== restrictions controller

// FUNCTION FOR GET ALL RESTRICTIONS
export const indexRest = async (req: Request, res: Response) => {
  try {
    const userId =
      (req.headers['x-user-id'] as string) ||
      (process.env.DEFAULT_USER_ID as string); // Get the user ID from the request or use the default user ID
    if (!userId) {
      return res.status(401).json({ error: 'Id do usuário não fornecido' }); // Return a 401 status code if the user ID is not provided
    }
    const result = await getRestrictions(userId);
    return res.status(200).json(result); // Return the preferences with a 200 status code
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: 'Erro interno do servidor' }); // Return a generic error message with a 500 status code
  }
};

//FUNCTION FOR UPDATE RESTRICTIONS
export const updateRest = async (req: Request, res: Response) => {
  try {
    const payload = RestrictionSchema.parse(req.body); // Validate the request body against the restrictionsSchema
    const userId =
      (req.headers['x-user-id'] as string) ||
      (process.env.DEFAULT_USER_ID as string); // Get the user ID from the request or use the default user ID
    if (!userId) {
      return res.status(401).json({ error: 'Id do usuário não fornecido' }); // Return a 401 status code if the user ID is not provided
    }
    const result = await updateRestrictions(userId, payload);
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
