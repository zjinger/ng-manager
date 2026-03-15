import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import type { ApiSuccessResponse } from './api.types';

type QueryParamValue = string | number | boolean;
type QueryParamsRecord = Record<string, QueryParamValue | readonly QueryParamValue[]>;

interface RequestOptions {
  params?: HttpParams | QueryParamsRecord;
}

@Injectable({ providedIn: 'root' })
export class HubApiService {
  public constructor(private readonly http: HttpClient) {}

  public get<T>(url: string, options?: RequestOptions): Observable<T> {
    const requestOptions = options ? { params: options.params } : undefined;
    return this.http
      .get<ApiSuccessResponse<T>>(url, requestOptions)
      .pipe(map((response) => response.data));
  }

  public post<TResponse, TBody = unknown>(
    url: string,
    body: TBody,
    options?: RequestOptions
  ): Observable<TResponse> {
    const requestOptions = options ? { params: options.params } : undefined;
    return this.http
      .post<ApiSuccessResponse<TResponse>>(url, body, requestOptions)
      .pipe(map((response) => response.data));
  }

  public put<TResponse, TBody = unknown>(
    url: string,
    body: TBody,
    options?: RequestOptions
  ): Observable<TResponse> {
    const requestOptions = options ? { params: options.params } : undefined;
    return this.http
      .put<ApiSuccessResponse<TResponse>>(url, body, requestOptions)
      .pipe(map((response) => response.data));
  }

  public patch<TResponse, TBody = unknown>(
    url: string,
    body: TBody,
    options?: RequestOptions
  ): Observable<TResponse> {
    const requestOptions = options ? { params: options.params } : undefined;
    return this.http
      .patch<ApiSuccessResponse<TResponse>>(url, body, requestOptions)
      .pipe(map((response) => response.data));
  }

  public delete<T>(url: string, options?: RequestOptions): Observable<T> {
    const requestOptions = options ? { params: options.params } : undefined;
    return this.http
      .delete<ApiSuccessResponse<T>>(url, requestOptions)
      .pipe(map((response) => response.data));
  }
}
