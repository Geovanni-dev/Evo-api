import type { Request, Response } from 'express';
import prisma from '../../prisma/prisma.js';
import { z } from 'zod';
import {
  getActiveMealPlan,
  updateActiveMealPlan,
} from '../services/mealPlanService.js';
import { generateMealPlan } from '../services/generateMealPlanService.js';
import { buildMealPlanRequestSchema } from '../schemas/mealPlanSchema.js';
import logger from '../../logger.js';

//=============================mealplanController

export const indexMealPlan = async (req: Request, res: Response) => {
  try {
    const userId =
      (req.headers['x-user-id'] as string) ||
      (process.env.DEFAULT_USER_ID as string);
    if (!userId) {
      return res.status(401).json({ error: 'Id do usuário não fornecido' });
    }
    const result = await getActiveMealPlan(userId);
    return res.status(200).json(result);
  } catch (error) {
    logger.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const updateMealPlan = async (req: Request, res: Response) => {
  try {
    const userId =
      (req.headers['x-user-id'] as string) ||
      (process.env.DEFAULT_USER_ID as string);
    if (!userId) {
      return res.status(401).json({ error: 'Id do usuário não fornecido' });
    }
    const nutritionGoal = await prisma.userNutritionGoal.findUnique({
      where: { userId },
    });
    if (!nutritionGoal) {
      return res
        .status(404)
        .json({ error: 'Objetivo nutricional não encontrado' });
    }
    const schema = buildMealPlanRequestSchema(nutritionGoal);

    const payload = schema.parse(req.body);

    const result = await updateActiveMealPlan(userId, payload);
    return res.status(200).json(result);
  } catch (error) {
    logger.error(error);
    if (error instanceof z.ZodError) {
      logger.error(error.issues, 'ZodError:');
      return res.status(400).json({
        error: 'Dados da solicitação inválidos',
        details: error.issues,
      });
    } else {
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
};

export const storeMealPlan = async (req: Request, res: Response) => {
  try {
    const userId =
      (req.headers['x-user-id'] as string) ||
      (process.env.DEFAULT_USER_ID as string);
    if (!userId) {
      return res.status(401).json({ error: 'Id do usuário não fornecido' });
    }
    const { plan, targets, warnings } = await generateMealPlan(userId);
    const savedPlan = await updateActiveMealPlan(userId, {
      status: 'active',
      planJson: plan,
    });
    return res.status(200).json({ ...savedPlan, targets, warnings });
  } catch (error) {
    logger.error(error, 'Erro ao gerar dieta');
    if (error instanceof Error) {
      if (error.message === 'Chave de API do Gemini não fornecida no .env') {
        return res
          .status(400)
          .json({ error: 'Chave de API do Gemini não fornecida no .env' });
      }
      if (error.message.includes('Meta nutricional')) {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('Preferências')) {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('JSON')) {
        return res
          .status(500)
          .json({ error: 'Erro ao processar resposta da IA' });
      }
    }
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
