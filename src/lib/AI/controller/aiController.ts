import type { Request, Response } from 'express'; // Import the Request and Response types from the Express library
import { chatWithAI } from '../services/aiService.js'; // Import the chatWithAI service function

//============================== aiControllers

export const storeChat = async (req: Request, res: Response) => {
  try {
    // Destructure the message, context, and history from the request body
    const { message, context = null, history = [] } = req.body;
    // Check if the message is provided
    if (!message) {
      return res.status(400).json({ error: 'Mensagem não fornecida' });
    }
    // Call the chatWithAI function to generate a response
    const response = await chatWithAI({
      messages: message,
      context,
      history,
    });
    return res.status(200).json({ response }); // Return the generated response
  } catch (error) {
    console.log(error);
    if (
      error instanceof Error &&
      error.message === 'Chave de API do Gemini não fornecida no .env'
    ) {
      return res
        .status(400)
        .json({ error: 'Chave de API do Gemini não fornecida no .env' }); // Return a 400 status code
    }
    return res.status(500).json({ error: 'Erro interno do servidor' }); // Return a generic error message
  }
};
