import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HubApiService } from '../../../core/http/hub-api.service';
import type { ProjectMemberItem } from '../../projects/projects.model';
import type {
  RdItem,
  RdItemDetailResult,
  RdItemFormValue,
  RdItemListResult,
  RdOverview,
  RdProjectOption,
  RdStageFormValue,
  RdStageItem,
  RdStatusChangeValue
} from '../models/rd.model';

@Injectable({ providedIn: 'root' })
export class RdManagementApiService {
  public constructor(private readonly api: HubApiService) {}

  public async listProjects(): Promise<RdProjectOption[]> {
    const result = await firstValueFrom(
      this.api.get<{ items: RdProjectOption[] }>('/api/admin/projects', {
        params: { page: 1, pageSize: 100, status: 'active' }
      })
    );
    return result.items;
  }

  public async listProjectMembers(projectId: string): Promise<ProjectMemberItem[]> {
    const result = await firstValueFrom(
      this.api.get<{ items: ProjectMemberItem[] }>(`/api/admin/projects/${projectId}/members`)
    );
    return result.items;
  }

  public async listStages(projectId: string): Promise<RdStageItem[]> {
    const result = await firstValueFrom(
      this.api.get<{ items: RdStageItem[] }>(`/api/admin/projects/${projectId}/rd/stages`)
    );
    return result.items;
  }

  public async createStage(projectId: string, value: RdStageFormValue): Promise<RdStageItem> {
    return firstValueFrom(this.api.post<RdStageItem, RdStageFormValue>(`/api/admin/projects/${projectId}/rd/stages`, value));
  }

  public async updateStage(projectId: string, stageId: string, value: Partial<RdStageFormValue>): Promise<RdStageItem> {
    return firstValueFrom(this.api.patch<RdStageItem, Partial<RdStageFormValue>>(`/api/admin/projects/${projectId}/rd/stages/${stageId}`, value));
  }

  public async deleteStage(projectId: string, stageId: string): Promise<void> {
    await firstValueFrom(this.api.delete(`/api/admin/projects/${projectId}/rd/stages/${stageId}`));
  }

  public async getOverview(projectId: string): Promise<RdOverview> {
    return firstValueFrom(this.api.get<RdOverview>(`/api/admin/projects/${projectId}/rd/overview`));
  }

  public async listItems(projectId: string, params: Record<string, string | number | boolean>): Promise<RdItemListResult> {
    return firstValueFrom(this.api.get<RdItemListResult>(`/api/admin/projects/${projectId}/rd/items`, { params }));
  }

  public async getItemDetail(projectId: string, itemId: string): Promise<RdItemDetailResult> {
    return firstValueFrom(this.api.get<RdItemDetailResult>(`/api/admin/projects/${projectId}/rd/items/${itemId}`));
  }

  public async createItem(projectId: string, value: RdItemFormValue): Promise<RdItem> {
    return firstValueFrom(
      this.api.post<RdItem, Record<string, string | number | null>>(`/api/admin/projects/${projectId}/rd/items`, {
        title: value.title,
        description: value.description,
        stageId: value.stageId,
        type: value.type,
        priority: value.priority,
        assigneeId: value.assigneeId || null,
        reviewerId: value.reviewerId || null,
        progress: value.progress,
        planStartAt: value.planStartAt || null,
        planEndAt: value.planEndAt || null,
        blockerReason: value.blockerReason || null
      })
    );
  }

  public async updateItem(projectId: string, itemId: string, value: RdItemFormValue): Promise<RdItem> {
    return firstValueFrom(
      this.api.patch<RdItem, Record<string, string | number | null>>(`/api/admin/projects/${projectId}/rd/items/${itemId}`, {
        title: value.title,
        description: value.description,
        stageId: value.stageId,
        type: value.type,
        priority: value.priority,
        assigneeId: value.assigneeId || null,
        reviewerId: value.reviewerId || null,
        progress: value.progress,
        planStartAt: value.planStartAt || null,
        planEndAt: value.planEndAt || null,
        blockerReason: value.blockerReason || null
      })
    );
  }

  public async changeStatus(projectId: string, itemId: string, value: RdStatusChangeValue): Promise<RdItem> {
    return firstValueFrom(
      this.api.post<RdItem, Record<string, string | null>>(`/api/admin/projects/${projectId}/rd/items/${itemId}/status`, {
        status: value.status,
        blockerReason: value.blockerReason || null
      })
    );
  }

  public async updateProgress(projectId: string, itemId: string, progress: number): Promise<RdItem> {
    return firstValueFrom(
      this.api.post<RdItem, { progress: number }>(`/api/admin/projects/${projectId}/rd/items/${itemId}/progress`, { progress })
    );
  }

  public async deleteItem(projectId: string, itemId: string): Promise<void> {
    await firstValueFrom(this.api.delete(`/api/admin/projects/${projectId}/rd/items/${itemId}`));
  }
}
