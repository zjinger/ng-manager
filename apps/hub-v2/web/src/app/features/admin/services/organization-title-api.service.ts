import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { ApiClientService } from '@core/http';
import type {
  CreateOrganizationTitleInput,
  OrganizationTitleEntity,
  UpdateOrganizationTitleInput
} from '../models/organization-title.model';

@Injectable({ providedIn: 'root' })
export class OrganizationTitleApiService {
  private readonly api = inject(ApiClientService);

  listTitles(query: { keyword?: string; status?: string } = {}) {
    return this.api
      .get<{ items: OrganizationTitleEntity[] }>('/organization-titles', query)
      .pipe(map((response) => response.items));
  }

  createTitle(input: CreateOrganizationTitleInput) {
    return this.api.post<OrganizationTitleEntity, CreateOrganizationTitleInput>('/organization-titles', input);
  }

  updateTitle(titleId: string, input: UpdateOrganizationTitleInput) {
    return this.api.patch<OrganizationTitleEntity, UpdateOrganizationTitleInput>(`/organization-titles/${titleId}`, input);
  }

  deleteTitle(titleId: string) {
    return this.api.delete<{ id: string }>(`/organization-titles/${titleId}`);
  }
}
