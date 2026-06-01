/**
 * Enables Wisdom365+ on every church tenant (persisted in Church.settings.tenantModules).
 * Run: pnpm --filter @church-hub/api exec ts-node prisma/enable-wisdom365-all-churches.ts
 */
import { PrismaClient, Prisma } from '@prisma/client';
import {
  mergeTenantModulesIntoSettings,
  type ChurchTenantModulesMap,
} from '@church-hub/shared-types';

const prisma = new PrismaClient();

async function main() {
  const churches = await prisma.church.findMany({ select: { id: true, name: true, settings: true } });
  let updated = 0;
  for (const church of churches) {
    const settings = mergeTenantModulesIntoSettings(
      (church.settings && typeof church.settings === 'object'
        ? church.settings
        : {}) as Record<string, unknown>,
      { wisdom365Plus: true } satisfies Partial<ChurchTenantModulesMap>,
    );
    await prisma.church.update({
      where: { id: church.id },
      data: { settings: settings as Prisma.InputJsonValue },
    });
    updated += 1;
    console.log(`Wisdom365+ enabled: ${church.name}`);
  }
  console.log(`Done — ${updated} church(es) updated.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
