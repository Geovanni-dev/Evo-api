import prisma from '../../prisma/prisma.js';
import { RefreshTokenInvalidoError } from '../../../errors.js';
import {
  createAppToken,
  createRefreshToken,
  hashRefreshToken,
} from './tokenService.js';

async function revokeSession(sessionId: string) {
  await prisma.authSession.updateMany({
    where: { id: sessionId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function refreshSession(refreshToken: string) {
  const tokenHash = hashRefreshToken(refreshToken);

  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { session: true },
  });

  if (!storedToken) {
    throw new RefreshTokenInvalidoError();
  }

  const session = storedToken.session;

  if (storedToken.usedAt) {
    await revokeSession(session.id);
    throw new RefreshTokenInvalidoError();
  }

  if (session.revokedAt || session.expiresAt <= new Date()) {
    throw new RefreshTokenInvalidoError();
  }

  const nextRefreshToken = createRefreshToken();
  const nextTokenHash = hashRefreshToken(nextRefreshToken);

  const result = await prisma.$transaction(async (tx) => {
    const currentSession = await tx.authSession.findUnique({
      where: { id: session.id },
    });

    if (
      !currentSession ||
      currentSession.revokedAt ||
      currentSession.expiresAt <= new Date()
    ) {
      return 'invalid' as const;
    }

    const consumed = await tx.refreshToken.updateMany({
      where: { id: storedToken.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    if (consumed.count !== 1) {
      return 'reused' as const;
    }

    await tx.refreshToken.create({
      data: {
        sessionId: session.id,
        tokenHash: nextTokenHash,
      },
    });

    return 'ok' as const;
  });

  if (result === 'reused') {
    await revokeSession(session.id);
    throw new RefreshTokenInvalidoError();
  }

  if (result !== 'ok') {
    throw new RefreshTokenInvalidoError();
  }

  return {
    token: createAppToken(session.userId, session.id),
    refreshToken: nextRefreshToken,
  };
}

export async function logoutSession(userId: string, sessionId: string) {
  await prisma.authSession.updateMany({
    where: { id: sessionId, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
