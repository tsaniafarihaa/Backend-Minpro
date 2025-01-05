<<<<<<< HEAD
import { PrismaClient } from "@prisma/client"; // Adjust relative path as needed
=======
import { PrismaClient } from "../prisma/generated/client";
>>>>>>> b4237b98d5c36ed62460e4a5d3105a1bee3a357a

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

export default prisma;
