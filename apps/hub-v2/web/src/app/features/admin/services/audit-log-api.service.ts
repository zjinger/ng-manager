import { inject, Injectable } from '@angular/core';
import { ApiClientService } from '@core/http';
import type { AuditLogListQuery, AuditLogListResult } from '../models/audit-log.model';

@Injectable({ providedIn: 'root' })
export class AuditLogApiService {
  private readonly api = inject(ApiClientService);

  list(query: AuditLogListQuery) {
    return this.api.get<AuditLogListResult>('/audit-logs', query);
  }
}
