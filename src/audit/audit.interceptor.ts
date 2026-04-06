import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Only audit POST, PATCH, DELETE
    if (!['POST', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const controllerClass = context.getClass().name;
    const handlerName = context.getHandler().name;

    return next.handle().pipe(
      tap(async (response) => {
        try {
          const userId = request.user?.id;

          // Skip if no user (public endpoints)
          if (!userId) return;

          const action = `${method} ${controllerClass}.${handlerName}`;
          const entityId = response?.id || request.params?.id || undefined;

          await this.prisma.auditLog.create({
            data: {
              userId,
              action,
              entity: controllerClass,
              entityId: entityId ? String(entityId) : undefined,
              payload: request.body || undefined,
              ip: request.ip || request.connection?.remoteAddress || undefined,
            },
          });
        } catch (error) {
          // Don't let audit logging failures break the request
          console.error('Audit log error:', error);
        }
      }),
    );
  }
}
