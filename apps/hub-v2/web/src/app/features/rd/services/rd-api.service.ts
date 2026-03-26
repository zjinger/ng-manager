import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';

import { ApiClientService } from '@core/http';
import type {
  BlockRdItemInput,
  AdvanceRdStageInput,
  CreateRdItemInput,
  CreateRdStageInput,
  RdItemEntity,
  RdLogEntity,
  RdListQuery,
  RdListResult,
  RdStageEntity,
  UpdateRdItemInput,
  UpdateRdStageInput,
} from '../models/rd.model';

@Injectable({ providedIn: 'root' })
export class RdApiService {
  private readonly api = inject(ApiClientService);

  listStages(projectId: string) {
    return this.api.get<{ items: RdStageEntity[] }>('/rd/stages', { projectId }).pipe(map((response) => response.items));
  }

  createStage(input: CreateRdStageInput) {
    return this.api.post<RdStageEntity, CreateRdStageInput>('/rd/stages', input);
  }

  updateStage(stageId: string, input: UpdateRdStageInput) {
    return this.api.patch<RdStageEntity, UpdateRdStageInput>(`/rd/stages/${stageId}`, input);
  }

  listItems(query: Partial<RdListQuery>) {
    return this.api.get<RdListResult>('/rd/items', query);
  }

  getById(itemId: string) {
    return this.api.get<RdItemEntity>(`/rd/items/${itemId}`);
  }

  listLogs(itemId: string) {
    return this.api.get<{ items: RdLogEntity[] }>(`/rd/items/${itemId}/logs`).pipe(map((response) => response.items));
  }

  create(input: CreateRdItemInput) {
    return this.api.post<RdItemEntity, CreateRdItemInput>('/rd/items', input);
  }

  update(itemId: string, input: UpdateRdItemInput) {
    return this.api.patch<RdItemEntity, UpdateRdItemInput>(`/rd/items/${itemId}`, input);
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

  advanceStage(itemId: string, input: AdvanceRdStageInput) {
    return this.api.post<RdItemEntity, AdvanceRdStageInput>(`/rd/items/${itemId}/advance-stage`, input);
  }

  accept(itemId: string) {
    return this.api.post<RdItemEntity>(`/rd/items/${itemId}/accept`);
  }

  close(itemId: string) {
    return this.api.post<RdItemEntity>(`/rd/items/${itemId}/close`);
  }

  delete(itemId: string) {
    return this.api.delete<{ id: string }>(`/rd/items/${itemId}`);
  }
}
