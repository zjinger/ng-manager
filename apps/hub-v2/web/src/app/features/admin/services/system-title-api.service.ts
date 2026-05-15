import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { ApiClientService } from '@core/http';
import type { CreateSystemTitleInput, SystemTitleEntity, UpdateSystemTitleInput } from '../models/system-title.model';

@Injectable({ providedIn: 'root' })
export class SystemTitleApiService {
  private readonly api = inject(ApiClientService);

  listTitles(query: { keyword?: string; status?: string } = {}) {
    return this.api
      .get<{ items: SystemTitleEntity[] }>('/titles', query)
      .pipe(map((response) => response.items));
  }

  createTitle(input: CreateSystemTitleInput) {
    return this.api.post<SystemTitleEntity, CreateSystemTitleInput>('/titles', input);
  }

  updateTitle(titleId: string, input: UpdateSystemTitleInput) {
    return this.api.patch<SystemTitleEntity, UpdateSystemTitleInput>(`/titles/${titleId}`, input);
  }

  deleteTitle(titleId: string) {
    return this.api.delete<{ id: string }>(`/titles/${titleId}`);
  }
}
