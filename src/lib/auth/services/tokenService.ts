import jwt from 'jsonwebtoken';
import { env } from '../../Configs/envs.js';

export const createAppToken = (userId: string) =>
  jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: '365' });
