import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';

import { ApiClientService } from '@core/http';
import type {
  BlockRdItemInput,
  CloseRdItemInput,
  AdvanceRdStageInput,
  CreateRdItemInput,
  CreateRdStageInput,
  RdItemEntity,
  RdItemProgress,
  RdLogEntity,
  RdListQuery,
  RdListResult,
  RdProgressHistory,
  RdStageHistoryEntry,
  RdStageEntity,
  UpdateRdItemInput,
  UpdateRdItemProgressInput,
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
    const normalizedQuery: Record<string, string | number | boolean | null | undefined> = {
      ...query,
      status: query.status && query.status.length > 0 ? query.status.join(',') : undefined,
      type: query.type && query.type.length > 0 ? query.type.join(',') : undefined,
      priority: query.priority && query.priority.length > 0 ? query.priority.join(',') : undefined,
      assigneeIds: query.assigneeIds && query.assigneeIds.length > 0 ? query.assigneeIds.join(',') : undefined,
      stageIds: query.stageIds && query.stageIds.length > 0 ? query.stageIds.join(',') : undefined,
    };
    return this.api.get<RdListResult>('/rd/items', normalizedQuery);
  }

  getById(itemId: string) {
    return this.api.get<RdItemEntity>(`/rd/items/${itemId}`);
  }

  listLogs(itemId: string) {
    return this.api.get<{ items: RdLogEntity[] }>(`/rd/items/${itemId}/logs`).pipe(map((response) => response.items));
  }

  listStageHistory(itemId: string) {
    return this.api.get<{ items: RdStageHistoryEntry[] }>(`/rd/items/${itemId}/stage-history`).pipe(map((response) => response.items));
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

  reopen(itemId: string) {
    return this.api.post<RdItemEntity>(`/rd/items/${itemId}/reopen`);
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

  close(itemId: string, input?: CloseRdItemInput) {
    return this.api.post<RdItemEntity, CloseRdItemInput>(`/rd/items/${itemId}/close`, input ?? {});
  }

  listProgress(itemId: string) {
    return this.api.get<RdItemProgress[]>(`/rd/items/${itemId}/progress`);
  }

  updateProgress(itemId: string, input: UpdateRdItemProgressInput) {
    return this.api.post<RdItemEntity, UpdateRdItemProgressInput>(`/rd/items/${itemId}/progress`, input);
  }

  listProgressHistory(itemId: string) {
    return this.api.get<RdProgressHistory[]>(`/rd/items/${itemId}/progress/history`);
  }
}
