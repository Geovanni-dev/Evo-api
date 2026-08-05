import type { Request, Response } from 'express';
import {
  PreferenceSchema,
  RestrictionSchema,
} from '../schemas/preferencesSchema.js';
import {
  getPreferences,
  updatePreferences,
  getRestrictions,
  updateRestrictions,
} from '../services/preferencesService.js';
import { z } from 'zod';

//========================================= preferences controller

export const indexPref = async (req: Request, res: Response) => {
  try {
    const userId =
      (req.headers['x-user-id'] as string) ||
      (process.env.DEFAULT_USER_ID as string);
    if (!userId) {
      return res.status(401).json({ error: 'Id do usuário não fornecido' });
    }
    const result = await getPreferences(userId);
    return res.status(200).json(result);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const updatePref = async (req: Request, res: Response) => {
  try {
    const payload = PreferenceSchema.parse(req.body);
    const userId =
      (req.headers['x-user-id'] as string) ||
      (process.env.DEFAULT_USER_ID as string);
    if (!userId) {
      return res.status(401).json({ error: 'Id do usuário não fornecido' });
    }
    const result = await updatePreferences(userId, payload);
    return res.status(200).json(result);
  } catch (error) {
    console.log(error);
    if (error instanceof z.ZodError) {
      console.error('ZodError:', JSON.stringify(error.issues, null, 2));
      return res.status(400).json({
        error: 'Dados da solicitação inválidos',
        details: error.issues,
      });
    } else {
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
};

//=================================== restrictions controller

export const indexRest = async (req: Request, res: Response) => {
  try {
    const userId =
      (req.headers['x-user-id'] as string) ||
      (process.env.DEFAULT_USER_ID as string);
    if (!userId) {
      return res.status(401).json({ error: 'Id do usuário não fornecido' });
    }
    const result = await getRestrictions(userId);
    return res.status(200).json(result);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const updateRest = async (req: Request, res: Response) => {
  try {
    const payload = RestrictionSchema.parse(req.body);
    const userId =
      (req.headers['x-user-id'] as string) ||
      (process.env.DEFAULT_USER_ID as string);
    if (!userId) {
      return res.status(401).json({ error: 'Id do usuário não fornecido' });
    }
    const result = await updateRestrictions(userId, payload);
    return res.status(200).json(result);
  } catch (error) {
    console.log(error);
    if (error instanceof z.ZodError) {
      console.error('ZodError:', JSON.stringify(error.issues, null, 2));
      return res.status(400).json({
        error: 'Dados da solicitação inválidos',
        details: error.issues,
      });
    } else {
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
};
