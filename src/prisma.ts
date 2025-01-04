import { PrismaClient } from "@prisma/client"; // Adjust relative path as needed

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

export default prisma;
