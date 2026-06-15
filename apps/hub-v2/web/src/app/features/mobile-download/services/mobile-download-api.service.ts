import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';

import type { ApiSuccessResponse } from '@core/http';
import type { MobileAppDownloadInfo } from '../models/mobile-download.model';

@Injectable({ providedIn: 'root' })
export class MobileDownloadApiService {
  private readonly http = inject(HttpClient);

  getDownloadInfo(projectKey: string) {
    return this.http
      .get<ApiSuccessResponse<MobileAppDownloadInfo>>(
        `/api/public/mobile-app/projects/${encodeURIComponent(projectKey)}/download`,
      )
      .pipe(map((response) => response.data));
  }
}
