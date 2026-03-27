import { inject, Injectable } from '@angular/core';
import { ApiClient } from '@app/core';
import { AdvanceRdStageInput, BlockRdItemInput, RdItemEntity, RdListQuery, RdListResult } from '../models/rd.model';
import { HttpParams } from '@angular/common/http';
import { ApiClientService } from '@pages/api-client/services';
import { ProjectStateService } from '@pages/projects/services/project.state.service';

@Injectable({
  providedIn: 'root',
})
export class RdApiService {
  delete(itemId: string): import("rxjs").Observable<unknown> {
    throw new Error('Method not implemented.');
  }
  close(itemId: string): import("rxjs").Observable<unknown> {
    throw new Error('Method not implemented.');
  }
  accept(itemId: string): import("rxjs").Observable<unknown> {
    throw new Error('Method not implemented.');
  }
  advanceStage(itemId: string, input: AdvanceRdStageInput): import("rxjs").Observable<unknown> {
    throw new Error('Method not implemented.');
  }
  complete(itemId: string): import("rxjs").Observable<unknown> {
    throw new Error('Method not implemented.');
  }
  resume(itemId: string): import("rxjs").Observable<unknown> {
    throw new Error('Method not implemented.');
  }
  block(itemId: string, input: BlockRdItemInput): import("rxjs").Observable<unknown> {
    throw new Error('Method not implemented.');
  }
  start(itemId: string): import("rxjs").Observable<unknown> {
    throw new Error('Method not implemented.');
  }
  private readonly apiClient = inject(ApiClientService);
  private readonly proState = inject(ProjectStateService);
  private readonly projectId = this.proState.currentProjectId();

  // TODO：后面统一设置项目key（现在默认为HUB）
  async getRdItemsList(query: RdListQuery) {
    if (!this.projectId) return;
    return await this.apiClient.hubTokenRequest({
      projectId: this.projectId,
      path: '/rd-items',
      query: { ...query },
    });
  }
  async getRdItem(rdItemId: string) {
    if (!this.projectId) return;
    return await this.apiClient.hubTokenRequest({
      projectId: this.projectId,
      path: `/rd-items/${rdItemId}`,
    });
  }

  async getRdItemLogs(rdItemId: string) {
    if (!this.projectId) return;
    return await this.apiClient.hubTokenRequest({
      projectId: this.projectId,
      path: `/rd-items/${rdItemId}/logs`,
    });
  }
}
