import type { Request, Response } from 'express'; // Import the Request and Response types from the Express library

//============================== aiControllers

export const chat = async (req: Request, res: Response) => {
  try {
    const message = req.body.message;
    if (!message) {
      return res.status(400).json({ error: 'Mensagem não fornecida' });
    } else {
      return res.status(200).json({ message });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
