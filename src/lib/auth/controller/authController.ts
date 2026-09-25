import type { Request, Response } from 'express';
import { z } from 'zod';
import {
  GoogleTokenInvalidoError,
  PayloadVazioError,
  RefreshTokenInvalidoError,
} from '../../../errors.js';
import {
  googleLoginSchema,
  refreshSessionSchema,
} from '../schemas/authSchema.js';
import { loginWithGoogle } from '../services/googleAuthService.js';
import {
  logoutSession,
  refreshSession,
} from '../services/refreshSessionService.js';

export async function googleLogin(req: Request, res: Response) {
  try {
    const { idToken } = googleLoginSchema.parse(req.body);
    const result = await loginWithGoogle(idToken);
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados inválidos' });
    }

    if (
      error instanceof GoogleTokenInvalidoError ||
      error instanceof PayloadVazioError
    ) {
      return res.status(401).json({ error: 'Token Google inválido' });
    }

    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

export async function refreshLogin(req: Request, res: Response) {
  try {
    const { refreshToken } = refreshSessionSchema.parse(req.body);
    const result = await refreshSession(refreshToken);
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados inválidos' });
    }

    if (error instanceof RefreshTokenInvalidoError) {
      return res.status(401).json({ error: error.message });
    }

    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

export async function logout(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  await logoutSession(req.user.sub, req.user.sid);
  return res.status(204).send();
}
