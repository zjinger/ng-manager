import { HttpClient, HttpParams } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { unwrapApi } from "./api-executor";
import type { ApiSuccess } from "./api.types";

@Injectable({ providedIn: "root" })
export class ApiClient {
    private http = inject(HttpClient);

    get<T>(url: string, params?: HttpParams) {
        return this.http
            .get<ApiSuccess<T>>(url, { params })
            .pipe(unwrapApi<T>());
    }

    post<T>(url: string, body?: any) {
        return this.http
            .post<ApiSuccess<T>>(url, body)
            .pipe(unwrapApi<T>());
    }

    delete<T>(url: string) {
        return this.http
            .get<ApiSuccess<T>>(url)
            .pipe(unwrapApi<T>());
    }
}
