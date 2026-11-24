import { Prisma } from '@prisma/client';
import { getTenantContext } from './tenant-context';

/** Models that soft-delete via deletedAt and must hide trash by default. */
const SOFT_DELETE_MODELS = new Set(['Member', 'PastoralNote']);

/**
 * Models that receive automatic churchId scoping when ALS has churchId.
 * Platform/system paths must call runWithTenantBypass / bypassTenantScope.
 */
const TENANT_MODELS = new Set([
  'Member',
  'PastoralNote',
  'FollowUp',
  'OutreachContact',
  'Family',
]);

function mergeWhere(
  existing: Record<string, unknown> | undefined,
  extra: Record<string, unknown>,
): Record<string, unknown> {
  if (!existing || Object.keys(existing).length === 0) return { ...extra };
  return { AND: [existing, extra] };
}

function applyReadFilters(model: string, args: { where?: Record<string, unknown> }) {
  const ctx = getTenantContext();
  if (ctx.bypassTenantScope) return;

  if (SOFT_DELETE_MODELS.has(model) && !ctx.includeDeleted) {
    args.where = mergeWhere(args.where, { deletedAt: null });
  }

  if (TENANT_MODELS.has(model) && ctx.churchId) {
    args.where = mergeWhere(args.where, { churchId: ctx.churchId });
  }
}

/**
 * Prisma client extension: soft-delete filter + optional churchId scoping from ALS.
 * Applied to findMany / findFirst / count / updateMany / deleteMany.
 * findUnique is intentionally untouched (unique-where cannot add deletedAt/churchId);
 * tenant services must use findFirst({ id, churchId }) for those models.
 */
export function createTenantPrismaExtension() {
  return Prisma.defineExtension({
    name: 'churchHubTenantGuard',
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          applyReadFilters(model, args as { where?: Record<string, unknown> });
          return query(args);
        },
        async findFirst({ model, args, query }) {
          applyReadFilters(model, args as { where?: Record<string, unknown> });
          return query(args);
        },
        async count({ model, args, query }) {
          applyReadFilters(model, args as { where?: Record<string, unknown> });
          return query(args);
        },
        async updateMany({ model, args, query }) {
          applyReadFilters(model, args as { where?: Record<string, unknown> });
          return query(args);
        },
        async deleteMany({ model, args, query }) {
          applyReadFilters(model, args as { where?: Record<string, unknown> });
          return query(args);
        },
      },
    },
  });
}
