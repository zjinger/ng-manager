import { inject, Injectable } from '@angular/core';
import { ApiClient } from '@app/core';
import { ProjectContextStore } from '@app/core/stores';
type RdActionType =
  | 'accept'
  | 'start'
  | 'progress'
  | 'update'
  | 'block'
  | 'resume'
  | 'complete'
  | 'close'
  | 'delete';

@Injectable({
  providedIn: 'root',
})
export class RdTokenApiService {
  private apiClient: ApiClient = inject(ApiClient);
  private projectContext = inject(ProjectContextStore)

  /**
   * 通过个人token 操作hub v2 的数据（写操作）
   */
  async rdPostReqWithPK<T>(body: {
    // projectId: string;
    rdId: string;
    // type: 'issues' | 'rd-items';
    action: RdActionType;
    payload: Object; //{content:string}
  }) {
    const projectId = this.projectContext.currentProjectId()!;
    return this.apiClient.hubRequestWithPersonalToken<T>({
      projectId: projectId,
      method: 'POST',
      path: `/rd-items/${body.rdId}/${body.action}`,
      payload: body.payload,
    });
  }

  /**
   * 通过个人token 操作hub v2 的数据（删除操作）
   */
  async rdDeleteReqWithPK<T>(body: {
    // projectId: string;
    rdId: string;
    // type: 'issues' | 'rd-items';
    payload: Object; //{content:string}
  }) {
    const projectId = this.projectContext.currentProjectId()!;
    return this.apiClient.hubRequestWithPersonalToken<T>({
      projectId: projectId,
      method: 'DELETE',
      path: `/rd-items/${body.rdId}`,
      payload: body.payload,
    });
  }
}
