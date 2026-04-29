import { HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiClient } from '@app/core';
import { LocalStateStore, LS_KEYS } from '@core/local-state';
import { ApiHistoryEntity } from '@models/api-client/api-history.model';
import { ApiCollectionCreateBody, ApiCollectionEntity, ApiCollectionUpdateBody, ApiRequestEntity, ApiScope, SendRequestBody, SendResponse } from '@models/api-client';
import { ApiEnvEntity } from '@models/api-client/api-environment.model';
import type {
  ApiEnvironmentEntityDto,
  ApiHistoryEntityDto,
  ApiRequestKvDto,
  ApiRequestEntityDto,
  ApiResponseMetricsDto,
  CreateCollectionBodyDto,
  SaveEnvBodyDto,
  SaveRequestBodyDto,
  SendRequestBodyDto,
  SendResultDto,
  UpdateCollectionBodyDto,
  UpdateRequestBodyDto,
} from '@yinuo-ngm/protocol';
import { firstValueFrom } from 'rxjs';


@Injectable({
  providedIn: 'root',
})
export class ApiClientService {
  private http = inject(ApiClient);
  private ls = inject(LocalStateStore);
  private base = '/api/client';
  private nextKvId = 1;

  private mapKvRows(rows?: ApiRequestKvDto[]) {
    return (rows ?? []).map((row) => ({
      id: `kv_${this.nextKvId++}`,
      key: row.key,
      value: row.value,
      enabled: row.enabled,
    }));
  }

  private toRequestEntity(dto: ApiRequestEntityDto): ApiRequestEntity {
    return {
      ...dto,
      query: this.mapKvRows(dto.query),
      pathParams: this.mapKvRows(dto.pathParams),
      headers: this.mapKvRows(dto.headers),
    };
  }

  private toHistoryEntity(dto: ApiHistoryEntityDto): ApiHistoryEntity {
    return {
      ...dto,
      requestSnapshot: this.toRequestEntity(dto.requestSnapshot),
    };
  }

  private toSendResponse(dto: SendResultDto): SendResponse {
    const curl = dto.curl as { bash?: string; powershell?: string; cmd?: string } | undefined;
    return {
      ...dto,
      curl: curl
        ? {
            bash: curl.bash ?? "",
            powershell: curl.powershell ?? "",
            cmd: curl.cmd ?? "",
          }
        : undefined,
      metrics: dto.metrics as ApiResponseMetricsDto,
    };
  }

  async listRequests(scope: ApiScope, projectId?: string) {
    let params = new HttpParams().set('scope', scope);
    if (projectId) params = params.set('projectId', projectId);
    const list = await firstValueFrom(this.http.get<ApiRequestEntityDto[]>(`${this.base}/requests`, params));
    return list.map((dto) => this.toRequestEntity(dto));
  }

  async saveRequest(scope: ApiScope, projectId: string | undefined, request: ApiRequestEntity) {
    const body: SaveRequestBodyDto = { scope, projectId, request };
    return await firstValueFrom(
      this.http.post<{ id: string }>(`${this.base}/requests`, body)
    );
  }

  async updateRequest(scope: ApiScope, projectId: string | undefined, request: Partial<ApiRequestEntity>) {
    const body: UpdateRequestBodyDto = { scope, projectId, request: request as ApiRequestEntityDto };
    return await firstValueFrom(
      this.http.post<{ id: string }>(`${this.base}/requests/update`, body)
    );
  }


  async deleteRequest(id: string, scope: ApiScope, projectId?: string) {
    let params = new HttpParams().set('scope', scope);
    if (projectId) params = params.set('projectId', projectId);
    return await firstValueFrom(
      this.http.delete<void>(`${this.base}/requests/${id}`, params)
    );
  }

  async send(body: SendRequestBody) {
    const dto = await firstValueFrom(this.http.post<SendResultDto>(`${this.base}/send`, body as SendRequestBodyDto));
    return this.toSendResponse(dto);
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
    const list = await firstValueFrom(
      this.http.get<ApiHistoryEntityDto[]>(`${this.base}/history`, params)
    );
    return list.map((dto) => this.toHistoryEntity(dto));
  }

  async listEnvs(scope: ApiScope, projectId?: string) {
    let params = new HttpParams().set('scope', scope);
    if (projectId) params = params.set('projectId', projectId);
    const list = await firstValueFrom(this.http.get<ApiEnvironmentEntityDto[]>(`${this.base}/envs`, params));
    return list as ApiEnvEntity[];
  }

  async saveEnv(scope: ApiScope, projectId: string | undefined, env: ApiEnvEntity) {
    const body: SaveEnvBodyDto = { scope, projectId, env };
    return await firstValueFrom(
      this.http.post<{ id: string }>(`${this.base}/envs`, body)
    );
  }

  async deleteEnv(id: string, scope: ApiScope, projectId?: string) {
    let params = new HttpParams().set('scope', scope);
    if (projectId) params = params.set('projectId', projectId);
    return await firstValueFrom(this.http.delete<void>(`${this.base}/envs/${id}`, params));
  }

  // Collection APIs
  async listCollections(scope: ApiScope, projectId?: string) {
    let params = new HttpParams().set('scope', scope);
    if (projectId) params = params.set('projectId', projectId);
    return await firstValueFrom(this.http.get<ApiCollectionEntity[]>(`${this.base}/collections`, params));
  }

  async createCollection(body: ApiCollectionCreateBody) {
    return await firstValueFrom(
      this.http.post<ApiCollectionEntity>(`${this.base}/collections`, body as CreateCollectionBodyDto)
    );
  }

  async updateCollection(id: string, body: Partial<ApiCollectionUpdateBody>, scope: ApiScope, projectId?: string) {
    const params = new HttpParams().set('scope', scope).set('projectId', projectId ?? '');
    return await firstValueFrom(
      this.http.post<ApiCollectionEntity>(`${this.base}/collections/${id}`, body as UpdateCollectionBodyDto, params)
    );
  }

  async deleteCollection(id: string, scope: ApiScope, projectId?: string) {
    const params = new HttpParams().set('scope', scope).set('projectId', projectId ?? '');
    return await firstValueFrom(
      this.http.delete<void>(`${this.base}/collections/${id}`, params)
    );
  }

}
