import { PrismaClient } from '../node_modules/.prisma/client/index.js';
import bcrypt from 'bcrypt';

import { z } from 'zod';

const prisma = new PrismaClient();

//===================================== zod

const userSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
});

//===================================== seed

const seed = async () => {
  try {
    const { name, email, password } = userSchema.parse({
      name: process.env.ADMIN_NAME,
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    });
    console.log(' Dados validados pelo esquema do zod:');

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
      where: { email },
      update: { name, password: passwordHash },
      create: {
        name,
        email,
        password: passwordHash,
      },
    });
    console.log(
      `Usuário criado/atualizado com sucesso: ${user.name} (${user.email})`,
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Erro de validação do zod:', error.issues);
    } else {
      console.error('Erro ao criar o usuário:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
};

seed();
