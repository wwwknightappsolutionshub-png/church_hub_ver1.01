import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { enterTenantContext } from '../../prisma/tenant-context';

/**
 * Binds JWT churchId into AsyncLocalStorage for the Prisma tenant extension
 * and optional Postgres RLS GUCs on subsequent queries in this request.
 */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{
      user?: { churchId?: string | null };
      query?: { includeDeleted?: string };
    }>();
    const churchId = req.user?.churchId ?? null;
    const includeDeleted =
      req.query?.includeDeleted === '1' || req.query?.includeDeleted === 'true';

    enterTenantContext({
      churchId,
      includeDeleted: includeDeleted || undefined,
    });

    return next.handle();
  }
}
