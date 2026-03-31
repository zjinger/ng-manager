import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiSuccess } from '@app/core';
import { firstValueFrom } from 'rxjs';
import { IssueActionType } from '../models/issue.model';
import { unwrapApi } from '@app/core/api/api-executor';

@Injectable({
  providedIn: 'root',
})
export class IssueTokenApiService {
  private http: HttpClient = inject(HttpClient);
  /**
   * 通过个人token 操作hub v2 的数据（写操作）
   */
  async hubRequestWithPersonalToken<T>(body: {
    issueId: string;
    // type: 'issues' | 'rd-items';
    action: IssueActionType;
    payload: Object; //{content:string}
  }) {
    const hubV2ProjectKey = 'HUB'; // Hub-ngm
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ngm_uptk_c1a288dcfb661999a9d52597725cee43e61574d1536f1f1b`, // pm.hub
    });
    return await firstValueFrom(
      this.http
        .post<ApiSuccess<T>>(
          `http://192.168.1.110:19528/api/personal/projects/${hubV2ProjectKey}/issues/${body.issueId}/${body.action}`,
          {
            ...body.payload,
          },
          {
            headers,
          },
        )
        .pipe(unwrapApi<T>()),
    );
  }
}
