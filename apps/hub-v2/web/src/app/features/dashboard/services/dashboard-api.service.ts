import { inject, Injectable } from '@angular/core';

import { ApiClientService } from '@core/http';
import type { DashboardHomeData } from '../models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardApiService {
  private readonly api = inject(ApiClientService);

  getHomeData() {
    return this.api.get<DashboardHomeData>('/dashboard/home');
  }
}
