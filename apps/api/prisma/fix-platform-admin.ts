import { PrismaClient } from '@prisma/client';
import { seedPlatformAdmin } from './seed-platform-admin';

const prisma = new PrismaClient();

seedPlatformAdmin(prisma)
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error(err);
    prisma.$disconnect();
    process.exit(1);
  });
