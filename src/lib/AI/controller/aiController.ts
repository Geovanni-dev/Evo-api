import type { Request, Response } from 'express';
import { chatWithAI } from '../services/aiService.js';

//============================== aiControllers

export const storeChat = async (req: Request, res: Response) => {
  try {
    const { message, context = null, history = [] } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Mensagem não fornecida' });
    }
    const response = await chatWithAI({
      messages: message,
      context,
      history,
    });
    return res.status(200).json({ response });
  } catch (error) {
    console.log(error);
    if (
      error instanceof Error &&
      error.message === 'Chave de API do Gemini não fornecida no .env'
    ) {
      return res
        .status(400)
        .json({ error: 'Chave de API do Gemini não fornecida no .env' });
    }
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
