import jwt from 'jsonwebtoken';
import { env } from '../../Configs/envs.js';

export const createAppToken = (userId: string, sessionId: string) =>
  jwt.sign({ sub: userId, sid: sessionId }, env.JWT_SECRET, {
    expiresIn: '365d',
  });
