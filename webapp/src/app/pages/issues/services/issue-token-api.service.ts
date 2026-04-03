import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiClient, ApiSuccess } from '@app/core';
import { firstValueFrom } from 'rxjs';
import { IssueActionType } from '../models/issue.model';
import { unwrapApi } from '@app/core/api/api-executor';
import { ProjectStateService } from '@pages/projects/services/project.state.service';

@Injectable({
  providedIn: 'root',
})
export class IssueTokenApiService {
  private apiClient: ApiClient = inject(ApiClient);
  private projectState = inject(ProjectStateService);
  /**
   * 通过个人token 操作hub v2 的数据（写操作）
   */
  async issuePostReqWithPK<T>(body: {
    issueId: string;
    action: IssueActionType;
    payload: Object; //{content:string}
  }) {
    return this.apiClient.hubRequestWithPersonalToken<T>({
      projectId: this.projectState.currentProjectId()!,
      method: 'POST',
      path: `/issues/${body.issueId}/${body.action}`,
      payload: body.payload,
    });
  }

  /**
   * 通过个人token 操作hub v2 的数据（删除操作）
   */
  async issueDeleteReqWithPK<T>(body: {
    issueId: string;
    deletedId: string;
    action: IssueActionType;
  }) {
    const projectId = this.projectState.currentProjectId()!;
    return this.apiClient.hubRequestWithPersonalToken<T>({
      projectId: projectId,
      method: 'DELETE',
      path: `/issues/${body.issueId}/${body.action}/${body.deletedId}`,
    });
  }
}
