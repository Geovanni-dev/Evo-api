import type { Request, Response } from 'express';
import {
  CreateMealSchema,
  DateSchema,
  UpdateMealSchema,
} from '../schemas/mealSchemas.js';
import {
  createMeal,
  getDailyMeals,
  getMealByType,
  updateMeal,
  deleteMeal,
  deleteItem,
  getMealSummary,
} from '../services/mealService.js';
import { z } from 'zod';
import logger from '../../logger.js';

//============================== mealsControllers

export const store = async (req: Request, res: Response) => {
  try {
    logger.info(req.headers, 'Headers:');
    logger.info(req.body, 'Body:');
    const payload = CreateMealSchema.parse(req.body);
    const userId =
      (req.headers['x-user-id'] as string) ||
      (process.env.DEFAULT_USER_ID as string);
    if (!userId) {
      return res.status(401).json({ error: 'Id do usuário não fornecido' });
    }
    const meal = await createMeal(payload, userId);
    return res.status(201).json(meal);
  } catch (error) {
    logger.error(error, 'ERRO NO POST /meals:');
    if (error instanceof z.ZodError) {
      logger.error(error.issues, 'ZodError:');
      return res.status(400).json({
        error: 'Dados da solicitação inválidos',
        details: error.issues,
      });
    } else if (
      error instanceof Error &&
      error.message === 'TDEE do usuário não encontrado'
    ) {
      return res.status(404).json({ error: 'TDEE do usuário não encontrado' });
    } else if (
      error instanceof Error &&
      error.message ===
        'Data da refeição inválida. Fora da janela permitida (-2 a +1 dias).'
    ) {
      return res.status(400).json({
        error:
          'Data da refeição inválida. Fora da janela permitida (-2 a +1 dias).',
      });
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
    const date = req.query.date as string | undefined;
    const result = await getDailyMeals(userId, date);
    return res.status(200).json(result);
  } catch (error) {
    logger.error(error);
    if (
      error instanceof Error &&
      error.message === 'TDEE do usuário nao encontrado'
    ) {
      return res.status(404).json({ error: 'TDEE do usuário não encontrado' });
    } else {
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
};

export const show = async (req: Request, res: Response) => {
  try {
    const userId =
      (req.headers['x-user-id'] as string) ||
      (process.env.DEFAULT_USER_ID as string);
    if (!userId) {
      return res.status(401).json({ error: 'Id do usuário não fornecido' });
    }
    const { mealType } = req.params;
    if (!mealType) {
      return res.status(400).json({ error: 'Tipo de refeição não fornecido' });
    }
    if (typeof mealType !== 'string') {
      return res
        .status(400)
        .json({ error: 'Tipo de refeição deve ser uma string' });
    }
    const date = req.query.date as string | undefined;
    const result = await getMealByType(mealType, userId, date);
    if (!result) {
      return res.status(404).json({ error: 'Refeição não encontrada' });
    }
    return res.status(200).json(result);
  } catch (error) {
    logger.error(error);
    if (error instanceof Error && error.message === 'Refeição não encontrada') {
      return res.status(404).json({ error: 'Refeição não encontrada' });
    } else {
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const payload = UpdateMealSchema.parse(req.body);
    const userId =
      (req.headers['x-user-id'] as string) ||
      (process.env.DEFAULT_USER_ID as string);
    if (!userId) {
      return res.status(401).json({ error: 'Id do usuário não fornecido' });
    }
    const { mealId } = req.params;
    if (!mealId) {
      return res.status(400).json({ error: 'Id da refeição nao fornecido' });
    }
    if (typeof mealId !== 'string') {
      return res
        .status(400)
        .json({ error: 'Id da refeição deve ser uma string' });
    }
    const result = await updateMeal(mealId, userId, payload);
    return res.status(200).json(result);
  } catch (error) {
    logger.error(error);
    if (error instanceof z.ZodError) {
      logger.error(error.issues, 'ZodError:');
      return res.status(400).json({
        error: 'Dados da solicitação inválidos',
        details: error.issues,
      });
    }
    if (error instanceof Error && error.message === 'Refeição não encontrada') {
      return res.status(404).json({ error: 'Refeição não encontrada' });
    } else {
      logger.error(error, 'Erro inesperado em PUT /meals:');
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
};

export const destroy = async (req: Request, res: Response) => {
  try {
    const userId =
      (req.headers['x-user-id'] as string) ||
      (process.env.DEFAULT_USER_ID as string);
    if (!userId) {
      return res.status(401).json({ error: 'Id do usuário não fornecido' });
    }
    const { mealId } = req.params;
    if (!mealId) {
      return res.status(400).json({ error: 'Id da refeição não fornecido' });
    }
    if (typeof mealId !== 'string') {
      return res
        .status(400)
        .json({ error: 'Id da refeição deve ser uma string' });
    }
    const result = await deleteMeal(mealId, userId);
    return res.status(200).json(result);
  } catch (error) {
    logger.error(error);
    if (error instanceof Error && error.message === 'Refeição não encontrada') {
      return res.status(404).json({ error: 'Refeição não encontrada' });
    } else {
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
};

export const destroyItem = async (req: Request, res: Response) => {
  try {
    const userId =
      (req.headers['x-user-id'] as string) ||
      (process.env.DEFAULT_USER_ID as string);
    if (!userId) {
      return res.status(401).json({ error: 'Id do usuário não fornecido' });
    }
    const { mealId, itemId } = req.params;
    if (!mealId) {
      return res.status(400).json({ error: 'Id da refeição nao fornecido' });
    }
    if (typeof mealId !== 'string') {
      return res
        .status(400)
        .json({ error: 'Id da refeição deve ser uma string' });
    }
    if (!itemId) {
      return res.status(400).json({ error: 'Id do item não fornecido' });
    }
    if (typeof itemId !== 'string') {
      return res.status(400).json({ error: 'Id do item deve ser uma string' });
    }
    const result = await deleteItem(mealId, itemId, userId);
    return res.status(200).json(result);
  } catch (error) {
    logger.error(error);
    if (error instanceof Error && error.message === 'Item não encontrado') {
      return res.status(404).json({ error: 'Item não encontrado' });
    } else {
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
};

export const indexMealSummary = async (req: Request, res: Response) => {
  try {
    const userId =
      (req.headers['x-user-id'] as string) ||
      (process.env.DEFAULT_USER_ID as string);
    if (!userId) {
      return res.status(401).json({ error: 'Id do usuário não fornecido' });
    }
    const date = DateSchema.parse(req.query);
    const result = await getMealSummary(userId, date);
    return res.status(200).json(result);
  } catch (error) {
    logger.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
