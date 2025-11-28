import { ActivityAction, ActivityEntityType } from "src/activity-log/entities/activity-log.enum";

export type LogIntercepterBody = {
    description?: string;
    meta?: {
        before?: string;
        after?: string;
        name?: string;
        [key: string]: unknown;
    };
    action?: ActivityAction;
    entityType?: ActivityEntityType;
    actionType?: ActivityAction;
    entityId?: number;
    entityName?: string;
};

export type LoggedResponse<T> = {
    data: T;
    log?: LogIntercepterBody;
};
