import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { ApiClientService } from '@core/http';
import type { SystemTitleEntity } from '../../admin/models/system-title.model';

@Injectable({ providedIn: 'root' })
export class UserTitleApiService {
  private readonly api = inject(ApiClientService);

  listActiveTitles() {
    return this.api
      .get<{ items: SystemTitleEntity[] }>('/titles', { status: 'active' })
      .pipe(map((response) => response.items));
  }

  listAllTitles() {
    return this.api
      .get<{ items: SystemTitleEntity[] }>('/titles')
      .pipe(map((response) => response.items));
  }
}
