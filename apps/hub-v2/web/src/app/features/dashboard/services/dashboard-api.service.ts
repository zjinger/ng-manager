import { inject, Injectable } from '@angular/core';
import { Observable, catchError, shareReplay, throwError } from 'rxjs';

import { ApiClientService } from '@core/http';
import type { DashboardHomeData } from '../models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardApiService {
  private readonly api = inject(ApiClientService);
  private homeDataRequest$: Observable<DashboardHomeData> | null = null;

  getHomeData(options?: { force?: boolean }): Observable<DashboardHomeData> {
    const force = !!options?.force;
    if (force || !this.homeDataRequest$) {
      this.homeDataRequest$ = this.api.get<DashboardHomeData>('/dashboard/home').pipe(
        catchError((error) => {
          this.homeDataRequest$ = null;
          return throwError(() => error);
        }),
        shareReplay(1)
      );
    }
    return this.homeDataRequest$;
  }

  invalidateHomeDataCache(): void {
    this.homeDataRequest$ = null;
  }
}
