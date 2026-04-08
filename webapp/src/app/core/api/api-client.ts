import { HttpClient, HttpParams } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { unwrapApi } from "./api-executor";
import type { ApiSuccess } from "./api.types";
import { firstValueFrom } from "rxjs";
import { LocalStateStore, LS_KEYS } from "../local-state";

@Injectable({ providedIn: "root" })
export class ApiClient {
  private ls = inject(LocalStateStore);
  private http = inject(HttpClient);
  private base = '/api/client';
  get<T>(url: string, params?: HttpParams) {
    return this.http
      .get<ApiSuccess<T>>(url, { params })
      .pipe(unwrapApi<T>());
  }

  post<T>(url: string, body?: any, params?: HttpParams) {
    return this.http
      .post<ApiSuccess<T>>(url, body, { params })
      .pipe(unwrapApi<T>());
  }

  delete<T>(url: string, params?: HttpParams) {
    return this.http
      .delete<ApiSuccess<T>>(url, { params })
      .pipe(unwrapApi<T>());
  }

  put<T>(url: string, body?: any, params?: HttpParams) {
    return this.http
      .put<ApiSuccess<T>>(url, body, { params })
      .pipe(unwrapApi<T>());
  }

  patch<T>(url: string, body?: any, params?: HttpParams) {
    return this.http
      .patch<ApiSuccess<T>>(url, body, { params })
      .pipe(unwrapApi<T>());
  }

  /**
   * 通过prjectId获取hub v2 的数据（读操作）
   * token 已经本地配置完成
   */
  async hubRequestWithPrjId<T>(body: {
    projectId: string;
    path: string;
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    query?: Record<string, string | string[] | number | boolean | undefined | null>;
    payload?: unknown;
    headers?: Record<string, string>;
  }) {
    return await firstValueFrom(this.http.post<ApiSuccess<T>>(`${this.base}/hub-token/request`, {
      projectId: body.projectId,
      path: body.path,
      method: body.method ?? "GET",
      query: body.query,
      body: body.payload,
      headers: body.headers,
    }).pipe(unwrapApi<T>()));
  }


  /**
  * 
  */
  async hubRequestWithPersonalToken<T>(body: {
    projectId: string;
    path: string;
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    query?: Record<string, string | string[] | number | boolean | undefined | null>;
    payload?: unknown;
    headers?: Record<string, string>;
  }) {
    return await firstValueFrom(this.http.post<ApiSuccess<T>>(`${this.base}/hub-token/request`, {
      projectId: body.projectId,
      path: body.path,
      method: body.method ?? "GET",
      query: body.query,
      body: body.payload,
      headers: body.headers,
      tokenType: 'personal',
      personalToken: this.ls.get<string>(LS_KEYS.token.hubV2PersonalToken, '').trim() || undefined,
    }).pipe(unwrapApi<T>()));
  }


}
