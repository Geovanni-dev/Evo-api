import { PrismaClient } from '../node_modules/.prisma/client/index.js'; // Import the PrismaClient class from the @prisma/client package
import bcrypt from 'bcrypt'; // Import the bcrypt library for password hashing

import { z } from 'zod'; // Import the zod library for schema validation

const prisma = new PrismaClient(); // Create a new instance of the PrismaClient

//===================================== zod

// Define a schema for user validation using zod
const userSchema = z.object({
  name: z.string().min(3), // Validate that the name is a string with a minimum length of 3 character
  email: z.string().email(), // Validate that the email is a string and a valid email format
  password: z.string().min(6), // Validate that the password is a string with a minimum length of 6 characters
});

//===================================== seed

const seed = async () => {
  try {
    const { name, email, password } = userSchema.parse({
      name: process.env.ADMIN_NAME, // Get the admin name from environment variables
      email: process.env.ADMIN_EMAIL, // Get the admin email from environment variables
      password: process.env.ADMIN_PASSWORD, // Get the admin password from environment variables
    });
    console.log(' Dados validados pelo esquema do zod:');

    const passwordHash = await bcrypt.hash(password, 10); // Hash the password using bcrypt with a salt rounds of 10

    const user = await prisma.user.upsert({
      where: { email },
      update: { name, password: passwordHash }, // Update the name and hashed password if the user already exists
      create: {
        name,
        email,
        password: passwordHash, // Store the hashed password in the database}
      },
    });
    console.log(
      `Usuário criado/atualizado com sucesso: ${user.name} (${user.email})`,
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Erro de validação do zod:', error.issues); // Log the validation errors from zod
    } else {
      console.error('Erro ao criar o usuário:', error); // not a zod error, log the error
    }
  } finally {
    await prisma.$disconnect(); // Disconnect the Prisma client from the database
  }
};

seed(); // Call the seed function to execute the seeding process
