import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createTenantPrismaExtension } from './tenant-prisma.extension';
import { getTenantContext } from './tenant-context';

function createExtendedClient() {
  return new PrismaClient().$extends(createTenantPrismaExtension());
}

export type ExtendedPrismaClient = ReturnType<typeof createExtendedClient>;

/**
 * Nest-injectable Prisma client with tenant soft-delete / churchId ALS extension.
 * Proxy forwards model delegates to the extended client while preserving Nest lifecycle methods.
 */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly client: ExtendedPrismaClient;

  constructor() {
    this.client = createExtendedClient();
    // eslint-disable-next-line no-constructor-return
    return new Proxy(this, {
      get: (target, prop, receiver) => {
        if (prop === 'client') return target.client;
        if (Reflect.has(target, prop)) {
          return Reflect.get(target, prop, receiver);
        }
        const value = Reflect.get(target.client as object, prop);
        return typeof value === 'function' ? value.bind(target.client) : value;
      },
    }) as unknown as PrismaService;
  }

  async onModuleInit() {
    await this.client.$connect();
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }

  /**
   * Run work inside a transaction that stamps Postgres RLS GUC values when enabled.
   */
  async withRlsContext<T>(fn: (tx: ExtendedPrismaClient) => Promise<T>): Promise<T> {
    const enabled = ['1', 'true', 'yes', 'on'].includes(
      (process.env.ENABLE_DB_RLS ?? '').toLowerCase(),
    );
    if (!enabled) {
      return fn(this.client);
    }

    const ctx = getTenantContext();
    return this.client.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SELECT set_config('app.rls_enforced', 'true', true)`);
      if (ctx.bypassRls || ctx.bypassTenantScope) {
        await tx.$executeRawUnsafe(`SELECT set_config('app.bypass_rls', 'true', true)`);
      } else if (ctx.churchId) {
        await tx.$executeRawUnsafe(
          `SELECT set_config('app.current_church_id', $1, true)`,
          ctx.churchId,
        );
        await tx.$executeRawUnsafe(`SELECT set_config('app.bypass_rls', 'false', true)`);
      } else {
        await tx.$executeRawUnsafe(`SELECT set_config('app.bypass_rls', 'true', true)`);
      }
      const extendedTx = (tx as PrismaClient).$extends(
        createTenantPrismaExtension(),
      ) as ExtendedPrismaClient;
      return fn(extendedTx);
    });
  }
}

// Ambient typing so existing `this.prisma.member` usages type-check.
export interface PrismaService extends ExtendedPrismaClient {}
