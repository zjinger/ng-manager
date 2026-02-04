import { HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiClient } from '@app/core';
import { ApiHistoryEntity } from '@models/api-history.model';
import { ApiRequestEntity, ApiScope } from '@models/api-request.model';
import { ApiEnvEntity } from '@models/api-environment.model';
import { firstValueFrom } from 'rxjs';

export type SendRequestBody = {
  scope: ApiScope;
  projectId?: string;
  requestId?: string;
  request?: ApiRequestEntity;
  envId?: string;
  projectRoot?: string;
};

export type SendResponse = {
  historyId: string;
  response?: {
    status: number;
    statusText?: string;
    headers: Record<string, string>;
    bodyText: string;
    bodySize: number;
  };
  error?: { code: string; message: string };
  metrics: { startedAt: number; endedAt: number; durationMs: number };
  curl?: { bash: string; powershell: string };
};
@Injectable({
  providedIn: 'root',
})
export class ApiClientService {
  private http = inject(ApiClient);
  private base = '/api/client';

  async listRequests(scope: ApiScope, projectId?: string) {
    let params = new HttpParams().set('scope', scope);
    if (projectId) params = params.set('projectId', projectId);
    return await firstValueFrom(this.http.get<ApiRequestEntity[]>(`${this.base}/requests`, params));
  }

  async saveRequest(scope: ApiScope, projectId: string | undefined, request: ApiRequestEntity) {
    return await firstValueFrom(
      this.http.post<{ id: string }>(`${this.base}/requests`, { scope, projectId, request })
    );
  }

  async send(body: SendRequestBody) {
    return await firstValueFrom(this.http.post<SendResponse>(`${this.base}/send`, body));
  }

  async listHistory(scope: ApiScope, projectId?: string) {
    let params = new HttpParams().set('scope', scope);
    if (projectId) params = params.set('projectId', projectId);
    return await firstValueFrom(
      this.http.get<ApiHistoryEntity[]>(`${this.base}/history`, params)
    );
  }

  async listEnvs(scope: ApiScope, projectId?: string) {
    let params = new HttpParams().set('scope', scope);
    if (projectId) params = params.set('projectId', projectId);
    return await firstValueFrom(this.http.get<ApiEnvEntity[]>(`${this.base}/envs`, params));
  }

  async saveEnv(scope: ApiScope, projectId: string | undefined, env: ApiEnvEntity) {
    return await firstValueFrom(
      this.http.post<{ id: string }>(`${this.base}/envs`, { scope, projectId, env })
    );
  }

  async deleteEnv(id: string) {
    return await firstValueFrom(this.http.delete<{ ok: true }>(`${this.base}/envs/${id}`));
  }
}
