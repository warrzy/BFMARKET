import { PrismaClient } from "@prisma/client";

// Les tests se connectent plusieurs fois avec les mêmes comptes : on remet les compteurs
// de limitation de débit à zéro pour que la protection anti-brute-force ne bloque pas la suite.
export default async function globalSetup() {
  const db = new PrismaClient();
  await db.rateLimit.deleteMany({});
  await db.$disconnect();
}
