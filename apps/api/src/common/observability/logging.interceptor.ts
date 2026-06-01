import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { Request } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest<Request>();
    const { method, originalUrl } = req;
    const churchId = (req as Request & { user?: { churchId?: string } }).user
      ?.churchId;
    const userId = (req as Request & { user?: { userId?: string } }).user
      ?.userId;
    const start = Date.now();
    const isYouth = originalUrl.includes('/youth');

    return next.handle().pipe(
      tap(() => {
        const ms = Date.now() - start;
        const payload = {
          method,
          path: originalUrl,
          ms,
          churchId,
          userId: userId ? `${userId.slice(0, 8)}…` : undefined,
          module: isYouth ? 'youth' : undefined,
        };
        if (ms > 2000) {
          this.logger.warn(JSON.stringify({ ...payload, slow: true }));
        } else if (isYouth) {
          this.logger.log(JSON.stringify(payload));
        }
      }),
      catchError((err: Error) => {
        const ms = Date.now() - start;
        this.logger.error(
          JSON.stringify({
            method,
            path: originalUrl,
            ms,
            error: err.message,
            module: isYouth ? 'youth' : undefined,
          }),
        );
        return throwError(() => err);
      }),
    );
  }
}
