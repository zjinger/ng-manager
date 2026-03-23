import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';

import { ApiClientService } from '../../../core/http/api-client.service';
import type { BlockRdItemInput, CreateRdItemInput, RdItemEntity, RdListQuery, RdListResult, RdStageEntity } from '../models/rd.model';

@Injectable({ providedIn: 'root' })
export class RdApiService {
  private readonly api = inject(ApiClientService);

  listStages(projectId: string) {
    return this.api.get<{ items: RdStageEntity[] }>('/rd/stages', { projectId }).pipe(map((response) => response.items));
  }

  listItems(query: Partial<RdListQuery>) {
    return this.api.get<RdListResult>('/rd/items', query);
  }

  getById(itemId: string) {
    return this.api.get<RdItemEntity>(`/rd/items/${itemId}`);
  }

  create(input: CreateRdItemInput) {
    return this.api.post<RdItemEntity, CreateRdItemInput>('/rd/items', input);
  }

  start(itemId: string) {
    return this.api.post<RdItemEntity>(`/rd/items/${itemId}/start`);
  }

  block(itemId: string, input: BlockRdItemInput) {
    return this.api.post<RdItemEntity, BlockRdItemInput>(`/rd/items/${itemId}/block`, input);
  }

  resume(itemId: string) {
    return this.api.post<RdItemEntity>(`/rd/items/${itemId}/resume`);
  }

  complete(itemId: string) {
    return this.api.post<RdItemEntity>(`/rd/items/${itemId}/complete`);
  }

  accept(itemId: string) {
    return this.api.post<RdItemEntity>(`/rd/items/${itemId}/accept`);
  }

  close(itemId: string) {
    return this.api.post<RdItemEntity>(`/rd/items/${itemId}/close`);
  }
}
