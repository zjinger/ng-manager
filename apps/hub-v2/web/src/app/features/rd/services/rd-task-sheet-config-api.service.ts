import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';

import { ApiClientService } from '@core/http';
import type {
  CreateRdTaskSheetDefaultRouteInput,
  RdTaskSheetDefaultRouteEntity,
  RdTaskSheetDefaultRouteQuery,
  UpdateRdTaskSheetDefaultRouteInput,
} from '../models/rd-task-sheet-config.model';

@Injectable({ providedIn: 'root' })
export class RdTaskSheetConfigApiService {
  private readonly api = inject(ApiClientService);

  listDefaultRoutes(query: RdTaskSheetDefaultRouteQuery = {}) {
    return this.api
      .get<{ items: RdTaskSheetDefaultRouteEntity[] }>('/rd/task-sheet-config/default-routes', query)
      .pipe(map((response) => response.items));
  }

  getMyDefaultRoute() {
    return this.api.get<RdTaskSheetDefaultRouteEntity | null>('/rd/task-sheet-config/default-routes/me');
  }

  matchDefaultRoute(issuerUserId: string | null | undefined) {
    return this.api.get<RdTaskSheetDefaultRouteEntity | null>('/rd/task-sheet-config/default-routes/match', {
      issuerUserId: issuerUserId || undefined,
    });
  }

  createDefaultRoute(input: CreateRdTaskSheetDefaultRouteInput) {
    return this.api.post<RdTaskSheetDefaultRouteEntity, CreateRdTaskSheetDefaultRouteInput>(
      '/rd/task-sheet-config/default-routes',
      input,
    );
  }

  updateDefaultRoute(routeId: string, input: UpdateRdTaskSheetDefaultRouteInput) {
    return this.api.patch<RdTaskSheetDefaultRouteEntity, UpdateRdTaskSheetDefaultRouteInput>(
      `/rd/task-sheet-config/default-routes/${routeId}`,
      input,
    );
  }

  deleteDefaultRoute(routeId: string) {
    return this.api.delete<{ id: string }>(`/rd/task-sheet-config/default-routes/${routeId}`);
  }
}
