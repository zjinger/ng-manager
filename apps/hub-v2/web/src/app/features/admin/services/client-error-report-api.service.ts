import { inject, Injectable } from '@angular/core';
import { ApiClientService } from '@core/http';
import type {
  ClientErrorReportEntity,
  ClientErrorReportListQuery,
  ClientErrorReportListResult,
} from '../models/client-error-report.model';

@Injectable({ providedIn: 'root' })
export class ClientErrorReportApiService {
  private readonly api = inject(ApiClientService);

  list(query: ClientErrorReportListQuery) {
    return this.api.get<ClientErrorReportListResult>('/client-error-reports', query);
  }

  getById(reportId: string) {
    return this.api.get<ClientErrorReportEntity>(`/client-error-reports/${reportId}`);
  }
}
