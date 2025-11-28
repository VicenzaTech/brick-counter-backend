import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { ActivityLogProvider } from 'src/activity-log.queue/activity-log.provider';
import { ActivitySeverity, ActivitySource } from 'src/activity-log/entities/activity-log.enum';
import { LogIntercepterBody } from 'src/common/type/log.response';

@Injectable()
export class LogInterceptor implements NestInterceptor {
    constructor(private readonly logProvider: ActivityLogProvider) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const req = context.switchToHttp().getRequest();
        const user = req.user;

        return next.handle().pipe(
            map((body: any) => {
                const hasLog = body && typeof body === 'object' && 'log' in body;
                const hasData = body && typeof body === 'object' && 'data' in body;
                const hasMeta = body && typeof body === 'object' && 'meta' in body;
                const hasPagidata = body && typeof body === 'object' && 'pagidata' in body;
                const payload = hasPagidata ? {
                    ...hasMeta ? { meta: body.meta } : {},
                    ...hasPagidata ? { pagidata: body.pagidata } : {},
                } : hasData ? body.data : body;

                if (hasLog) {
                    const logBody: LogIntercepterBody = body.log ?? {};

                    this.logProvider.logSuccessActivity({
                        userId: user?.id ?? undefined,
                        entityId: logBody.entityId ?? (body?.data?.id as number | undefined),
                        entityName: logBody.entityName ?? (body?.data?.name as string | undefined),
                        severity: ActivitySeverity.INFO,
                        source: ActivitySource.SYSTEM,

                        description: logBody.description,
                        metadata: logBody.meta as Record<string, any> | undefined,
                        action: logBody.action ?? body?.log?.action,
                        entityType: logBody.entityType ?? body?.log?.entityType,
                        actionType: logBody.actionType ?? body?.log?.actionType,
                    });
                }

                return payload;
            }),
        );
    }
}
