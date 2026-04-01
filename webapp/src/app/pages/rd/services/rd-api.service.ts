import { inject, Injectable } from '@angular/core';
import { ApiClient } from '@app/core';
import { AdvanceRdStageInput, BlockRdItemInput, RdItemEntity, RdListQuery, RdListResult, RdStageEntity, UpdateRdItemInput } from '../models/rd.model';
import { HttpParams } from '@angular/common/http';
import { ApiClientService } from '@pages/api-client/services';
import { ProjectStateService } from '@pages/projects/services/project.state.service';
import { RdTokenApiService } from './rd-token-api.service';

@Injectable({
  providedIn: 'root',
})
export class RdApiService {
  private readonly apiClient = inject(ApiClient);
  private readonly rdTokenApi = inject(RdTokenApiService);

  async delete(projectId: string, itemId: string) {
    return await this.rdTokenApi.rdDeleteReqWithPK<RdItemEntity>({
      rdId: itemId,
      action: 'delete',
      payload: {},
    });
  }


  async close(projectId: string, itemId: string, summary: string): Promise<RdItemEntity> {
    return await this.rdTokenApi.rdPostReqWithPK<RdItemEntity>({
      rdId: itemId,
      action: 'close',
      payload: { summary },
    });
  }

  async accept(projectId: string, itemId: string) {
    return await this.rdTokenApi.rdPostReqWithPK<RdItemEntity>({
      rdId: itemId,
      action: 'accept',
      payload: {},
    });
  }

  async resolve(projectId: string, issueId: string, summary?: string) {
    return await this.rdTokenApi.rdPostReqWithPK<RdItemEntity>({
      rdId: issueId,
      action: 'complete',
      payload: { summary },
    });
  }

  // 阻塞后重开
  async resume(projectId: string, itemId: string) :Promise<RdItemEntity> {
    return await this.rdTokenApi.rdPostReqWithPK<RdItemEntity>({
      rdId: itemId,
      action: 'resume',
      payload: {},
    });
  }

  async block(projectId: string, itemId: string, input: BlockRdItemInput): Promise<RdItemEntity> {
    return await this.rdTokenApi.rdPostReqWithPK<RdItemEntity>({
      rdId: itemId,
      action: 'block',
      payload: input,
    });
  }

  async start(projectId: string, itemId: string): Promise<RdItemEntity> {
    return await this.rdTokenApi.rdPostReqWithPK<RdItemEntity>({
      action: 'start',
      rdId: itemId,
      payload: {},
    });
  }

  async progress(projectId: string, itemId: string, progress: number): Promise<RdItemEntity> {
    return await this.rdTokenApi.rdPostReqWithPK<RdItemEntity>({
      rdId: itemId,
      action: 'progress',
      payload: { progress },
    });
  }

  async update(projectId: string, itemId: string, input: UpdateRdItemInput): Promise<RdItemEntity> {
    return await this.rdTokenApi.rdPostReqWithPK<RdItemEntity>({
      rdId: itemId,
      action: 'update',
      payload: { ...input },
    });
  }

  // TODO：后面统一设置项目key（现在默认为HUB）
  async getRdItemsList(projectId: string, query: RdListQuery) {
    return await this.apiClient.hubRequestWithPrjId<RdListResult>({
      projectId: projectId,
      path: '/rd-items',
      query: { ...query },
    });
  }
  async getRdItem(projectId: string, rdItemId: string) {
    return await this.apiClient.hubRequestWithPrjId<RdItemEntity>({
      projectId: projectId,
      path: `/rd-items/${rdItemId}`,
    });
  }

  async getRdStages(projectId: string) {
    return await this.apiClient.hubRequestWithPrjId<RdStageEntity[]>({
      projectId: projectId,
      path: '/rd/stages',
    });
  }

  async getRdItemLogs(projectId: string, rdItemId: string): Promise<any> {
    return await this.apiClient.hubRequestWithPrjId({
      projectId: projectId,
      path: `/rd-items/${rdItemId}/logs`,
    });
  }

  async getProjectMenbers(projectId: string): Promise<any> {
    return await this.apiClient.hubRequestWithPrjId({
      projectId: projectId,
      path: '/projects/${projectId}/members',
    });
  }
}
