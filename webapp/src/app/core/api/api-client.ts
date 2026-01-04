import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { map } from "rxjs";
import type { ApiSuccess } from "./api.types";

@Injectable({ providedIn: "root" })
export class ApiClient {
    private http = inject(HttpClient);

    get<T>(url: string) {
        return this.http
            .get<ApiSuccess<T>>(url)
            .pipe(map(res => res.data));
    }

    post<T>(url: string, body?: any) {
        return this.http
            .post<ApiSuccess<T>>(url, body)
            .pipe(map(res => res.data));
    }

    delete<T>(url: string) {
        return this.http
            .delete<ApiSuccess<T>>(url)
            .pipe(map(res => res.data));
    }
}
