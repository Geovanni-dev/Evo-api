import prisma from '../../prisma/prisma.js';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../../Configs/envs.js';
import { PayloadVazioError } from '../../../errors.js';
import {
  createAppToken,
  createRefreshToken,
  hashRefreshToken,
} from './tokenService.js';

const client = new OAuth2Client();

export async function verifyGoogleToken(idToken: string) {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email || payload.email_verified !== true) {
    throw new PayloadVazioError();
  }
  return {
    sub: payload.sub,
    email: payload.email,
    name: payload.name ?? null,
  };
}

export async function findGoogleAuthProviderBySub(sub: string) {
  return prisma.authProvider.findUnique({
    where: {
      provider_providerUserId: {
        provider: 'google',
        providerUserId: sub,
      },
    },
    include: { user: true },
  });
}

export const loginWithGoogle = async (idToken: string) => {
  const googleData = await verifyGoogleToken(idToken);
  const authProvider = await findGoogleAuthProviderBySub(googleData.sub);
  let user = authProvider?.user;

  if (!user) {
    const existingUser = await prisma.user.findUnique({
      where: { email: googleData.email },
    });

    if (existingUser) {
      await prisma.authProvider.create({
        data: {
          provider: 'google',
          providerUserId: googleData.sub,
          userId: existingUser.id,
        },
      });

      user = existingUser;
    } else {
      user = await prisma.user.create({
        data: {
          name:
            googleData.name?.trim() ||
            googleData.email.split('@')[0] ||
            'Usuário',
          email: googleData.email,
          authProviders: {
            create: {
              provider: 'google',
              providerUserId: googleData.sub,
            },
          },
        },
      });
    }
  }
  const refreshToken = createRefreshToken();
  const tokenHash = hashRefreshToken(refreshToken);
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  const session = await prisma.authSession.create({
    data: {
      userId: user.id,
      expiresAt,
      refreshTokens: {
        create: { tokenHash },
      },
    },
  });

  const token = createAppToken(user.id, session.id);

  return {
    token,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      whatsapp: user.whatsapp,
      whatsappVerifiedAt: user.whatsappVerifiedAt,
    },
  };
};
