import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';

import { ApiClientService } from '@core/http';
import { RD_VISIBLE_STATUSES } from '../models/rd.model';
import type {
  BlockRdItemInput,
  CloseRdItemInput,
  CompleteRdItemInput,
  AdvanceRdStageInput,
  CreateRdMemberBlockInput,
  CreateRdItemInput,
  CreateRdStageInput,
  RdItemEntity,
  RdMemberBlockEntity,
  RdItemProgress,
  RdLogEntity,
  RdListQuery,
  RdListResult,
  RdProgressHistory,
  RdStageHistoryEntry,
  RdStageEntity,
  ResolveRdMemberBlockInput,
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
    const { includeClosed, ...requestQuery } = query;
    const requestedStatus = query.status ?? [];
    const effectiveStatus = includeClosed === true
      ? requestedStatus
      : requestedStatus.filter((status) => status !== 'closed');
    const status = effectiveStatus.length > 0
      ? effectiveStatus.join(',')
      : includeClosed === true
        ? undefined
        : RD_VISIBLE_STATUSES.join(',');
    const normalizedQuery: Record<string, string | number | boolean | null | undefined> = {
      ...requestQuery,
      status,
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

  listMemberBlocks(itemId: string) {
    return this.api.get<{ items: RdMemberBlockEntity[] }>(`/rd/items/${itemId}/member-blocks`).pipe(map((response) => response.items));
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

  complete(itemId: string, input: CompleteRdItemInput = {}) {
    return this.api.post<RdItemEntity, CompleteRdItemInput>(`/rd/items/${itemId}/complete`, input);
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

  createMemberBlock(itemId: string, input: CreateRdMemberBlockInput) {
    return this.api.post<RdMemberBlockEntity, CreateRdMemberBlockInput>(`/rd/items/${itemId}/member-blocks`, input);
  }

  resolveMemberBlock(itemId: string, blockId: string, input: ResolveRdMemberBlockInput = {}) {
    return this.api.post<RdMemberBlockEntity, ResolveRdMemberBlockInput>(`/rd/items/${itemId}/member-blocks/${blockId}/resolve`, input);
  }

  listProgressHistory(itemId: string) {
    return this.api.get<RdProgressHistory[]>(`/rd/items/${itemId}/progress/history`);
  }
}
