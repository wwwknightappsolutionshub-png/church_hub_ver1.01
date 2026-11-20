/**
 * Prints a short-lived JWT for e2e/Playwright when password login requires 2FA.
 * Usage: npx ts-node scripts/mint-e2e-access-token.ts admin@demo.church
 */
import { PrismaClient } from '@prisma/client';
import { createHmac } from 'crypto';

function b64url(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function signHs256(payload: Record<string, unknown>, secret: string) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify(payload));
  const data = `${header}.${body}`;
  const sig = b64url(createHmac('sha256', secret).update(data).digest());
  return `${data}.${sig}`;
}

async function main() {
  const email = process.argv[2]?.trim();
  const secret = process.env.JWT_ACCESS_SECRET?.trim();
  if (!email) {
    console.error('Usage: mint-e2e-access-token.ts <email>');
    process.exit(1);
  }
  if (!secret) {
    console.error('JWT_ACCESS_SECRET is required');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, isActive: true },
    });
    if (!user) {
      console.error(`User not found: ${email}`);
      process.exit(1);
    }
    const now = Math.floor(Date.now() / 1000);
    const token = signHs256(
      {
        sub: user.id,
        churchId: user.churchId,
        email: user.email,
        iat: now,
        exp: now + 60 * 15,
      },
      secret,
    );
    process.stdout.write(token);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
