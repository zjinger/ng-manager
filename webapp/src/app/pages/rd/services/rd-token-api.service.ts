import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiSuccess } from '@app/core';
import { firstValueFrom } from 'rxjs';
import { unwrapApi } from '@app/core/api/api-executor';
type RdActionType =
  | 'accept'
  | 'start'
  | 'progress'
  | 'update'
  | 'block'
  | 'resume'
  | 'resolve'
  | 'close'
  | 'delete';

@Injectable({
  providedIn: 'root',
})
export class RdTokenApiService {
  private http: HttpClient = inject(HttpClient);
  /**
   * 通过个人token 操作hub v2 的数据（写操作）
   */
  async hubRequestWithPersonalToken<T>(body: {
    rdId: string;
    // type: 'issues' | 'rd-items';
    action: RdActionType;
    payload: Object; //{content:string}
  }) {
    const hubV2ProjectKey = 'HUB'; // Hub-ngm
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `ngm_uptk_c1a288dcfb661999a9d52597725cee43e61574d1536f1f1b`, // pm.hub
    });
    return await firstValueFrom(
      this.http
        .post<ApiSuccess<T>>(
          `/hubv2/api/personal/projects/${hubV2ProjectKey}/rd-items/${body.rdId}/${body.action}`,
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
