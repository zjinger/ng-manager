import { HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiClient } from '@app/core';
import { LocalStateStore, LS_KEYS } from '@core/local-state';
import { ApiHistoryEntity } from '@models/api-client/api-history.model';
import { ApiCollectionCreateBody, ApiCollectionEntity, ApiCollectionUpdateBody, ApiRequestEntity, ApiScope, SendRequestBody, SendResponse } from '@models/api-client';
import { ApiEnvEntity } from '@models/api-client/api-environment.model';
import { firstValueFrom } from 'rxjs';


@Injectable({
  providedIn: 'root',
})
export class ApiClientService {
  private http = inject(ApiClient);
  private ls = inject(LocalStateStore);
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

  async updateRequest(scope: ApiScope, projectId: string | undefined, request: Partial<ApiRequestEntity>) {
    return await firstValueFrom(
      this.http.post<{ id: string }>(`${this.base}/requests/update`, { scope, projectId, request })
    );
  }


  async deleteRequest(id: string, scope: ApiScope, projectId?: string) {
    let params = new HttpParams().set('scope', scope);
    if (projectId) params = params.set('projectId', projectId);
    return await firstValueFrom(
      this.http.delete<{ ok: true }>(`${this.base}/requests/${id}`, params)
    );
  }

  async send(body: SendRequestBody) {
    return await firstValueFrom(this.http.post<SendResponse>(`${this.base}/send`, body));
  }

  async hubTokenRequest(body: {
    projectId: string;
    tokenType?: 'project' | 'personal';
    path: string;
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    query?: Record<string, string | number | boolean | undefined | null>;
    payload?: unknown;
    headers?: Record<string, string>;
    personalToken?: string;
  }) {
    const tokenType = body.tokenType ?? 'project';
    let personalToken = body.personalToken;
    if (tokenType === 'personal' && !personalToken) {
      personalToken = this.ls.get<string>(LS_KEYS.token.hubV2PersonalToken, '').trim() || undefined;
    }
    return await firstValueFrom(this.http.post<unknown>(`${this.base}/hub-token/request`, {
      projectId: body.projectId,
      tokenType,
      path: body.path,
      method: body.method ?? "GET",
      query: body.query,
      body: body.payload,
      headers: body.headers,
      personalToken,
    }));
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

  async deleteEnv(id: string, scope: ApiScope, projectId?: string) {
    let params = new HttpParams().set('scope', scope);
    if (projectId) params = params.set('projectId', projectId);
    return await firstValueFrom(this.http.delete<{ ok: true }>(`${this.base}/envs/${id}`, params));
  }

  // Collection APIs
  async listCollections(scope: ApiScope, projectId?: string) {
    let params = new HttpParams().set('scope', scope);
    if (projectId) params = params.set('projectId', projectId);
    return await firstValueFrom(this.http.get<ApiCollectionEntity[]>(`${this.base}/collections`, params));
  }

  async createCollection(body: ApiCollectionCreateBody) {
    return await firstValueFrom(
      this.http.post<ApiCollectionEntity>(`${this.base}/collections`, body)
    );
  }

  async updateCollection(id: string, body: Partial<ApiCollectionUpdateBody>, scope: ApiScope, projectId?: string) {
    const params = new HttpParams().set('scope', scope).set('projectId', projectId ?? '');
    return await firstValueFrom(
      this.http.post<ApiCollectionEntity>(`${this.base}/collections/${id}`, body, params)
    );
  }

  async deleteCollection(id: string, scope: ApiScope, projectId?: string) {
    const params = new HttpParams().set('scope', scope).set('projectId', projectId ?? '');
    return await firstValueFrom(
      this.http.delete<{ ok: true }>(`${this.base}/collections/${id}`, params)
    );
  }

}
