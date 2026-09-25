import type { Request, Response, NextFunction } from 'express';
import { payloadUserSchema } from './schemas/middlewareSchema.js';
import jwt from 'jsonwebtoken';
import { env } from '../Configs/envs.js';

const SECRET = env.JWT_SECRET;

export const authMiddlewareUser = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }
  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }
  try {
    const payload = jwt.verify(token, SECRET);
    const payloadValidado = payloadUserSchema.parse(payload);
    req.user = {
      sub: payloadValidado.sub,
      sid: payloadValidado.sid,
      iat: payloadValidado.iat,
      exp: payloadValidado.exp,
    };
    return next();
  } catch {
    return res.status(401).json({
      error: 'Token Inválido',
    });
  }
};
