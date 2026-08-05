import type { Request, Response } from 'express';
import { z } from 'zod';
import nutritionGoalSchema from '../schemas/nutritionGoalsSchemas.js';
import {
  nutritionGoal,
  getNutritionGoal,
} from '../service/nutritionGoalsService.js';

//================== nurtritionGoalConrtoller

export const update = async (req: Request, res: Response) => {
  try {
    const payload = nutritionGoalSchema.parse(req.body);
    const userId =
      (req.headers['x-user-id'] as string) ||
      (process.env.DEFAULT_USER_ID as string);
    if (!userId) {
      return res.status(401).json({ error: 'Id do usuário não fornecido' });
    }
    const result = await nutritionGoal(userId, payload);
    return res.status(200).json(result);
  } catch (error) {
    console.log(error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Dados de solicitação inválidos',
        details: error.issues,
      });
    } else if (
      error instanceof Error &&
      error.message === 'Usuário não encontrado'
    ) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const index = async (req: Request, res: Response) => {
  try {
    const userId =
      (req.headers['x-user-id'] as string) ||
      (process.env.DEFAULT_USER_ID as string);
    if (!userId) {
      return res.status(401).json({ error: 'Id do usuário não fornecido' });
    }
    const result = await getNutritionGoal(userId);
    return res.status(200).json(result);
  } catch (error) {
    console.log(error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Dados de solicitação inválidos',
        details: error.issues,
      });
    } else if (
      error instanceof Error &&
      error.message === 'Usuário nao encontrado'
    ) {
      return res.status(404).json({ error: 'Usuário nao encontrado' });
    }
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
