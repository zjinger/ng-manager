import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { ApiClientService } from '@core/http';
import type { OrganizationTitleEntity } from '../../admin/models/organization-title.model';

@Injectable({ providedIn: 'root' })
export class UserTitleApiService {
  private readonly api = inject(ApiClientService);

  listActiveTitles() {
    return this.api
      .get<{ items: OrganizationTitleEntity[] }>('/organization-titles', { status: 'active' })
      .pipe(map((response) => response.items));
  }

  listAllTitles() {
    return this.api
      .get<{ items: OrganizationTitleEntity[] }>('/organization-titles')
      .pipe(map((response) => response.items));
  }
}
