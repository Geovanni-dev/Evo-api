import jwt from 'jsonwebtoken';
import { env } from '../../Configs/envs.js';
import { randomBytes, createHash } from 'node:crypto';

export const createAppToken = (userId: string, sessionId: string) =>
  jwt.sign({ sub: userId, sid: sessionId }, env.JWT_SECRET, {
    expiresIn: '15m',
  });

export function createRefreshToken(): string {
  const token = randomBytes(32).toString('hex');
  return token;
}

export function hashRefreshToken(token: string): string {
  const tokenHash = createHash('sha256').update(token).digest('hex');
  return tokenHash;
}
