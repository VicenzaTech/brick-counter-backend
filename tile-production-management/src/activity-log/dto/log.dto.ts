import {
  ActivityEntityType,
  ActivitySeverity,
  ActivitySource,
  ActivityStatus,
} from '../entities/activity-log.enum';

export class LogDTO {
  userId?: string;
  action: string;
  actionType: string;
  entityType?: ActivityEntityType;
  entityId?: number;
  entityName?: string;
  status: ActivityStatus;
  severity: ActivitySeverity;
  source: ActivitySource;
  metadata?: object;
  description?: string;
}
