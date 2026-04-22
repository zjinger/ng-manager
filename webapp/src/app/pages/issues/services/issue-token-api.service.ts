import { inject, Injectable } from '@angular/core';
import { ApiClient } from '@app/core';
import { ProjectContextStore } from '@app/core/stores';

@Injectable({
  providedIn: 'root',
})
export class IssueTokenApiService {
  private apiClient: ApiClient = inject(ApiClient);
  private projectContext = inject(ProjectContextStore);
  /**
   * 通过个人token 操作hub v2 的数据（写操作）
   */
  async issuePostReqWithPK<T>(body: { issueId: string; action: string; payload: Object }) {
    return this.apiClient.hubRequestWithPersonalToken<T>({
      projectId: this.projectContext.currentProjectId()!,
      method: 'POST',
      path: `/issues/${body.issueId}/${body.action}`,
      payload: body.payload,
    });
  }

  /**
   * 通过个人token 操作hub v2 的数据（删除操作）
   */
  async issueDeleteReqWithPK<T>(body: { issueId: string; deletedId: string; action: string }) {
    const projectId = this.projectContext.currentProjectId()!;
    return this.apiClient.hubRequestWithPersonalToken<T>({
      projectId: projectId,
      method: 'DELETE',
      path: `/issues/${body.issueId}/${body.action}/${body.deletedId}`,
    });
  }
}
