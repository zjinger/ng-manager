import { inject, Injectable } from '@angular/core';
import { ApiClient } from '@app/core';
import { DepGroup, DepItem, DepsResp } from '@models/deps.model';
import { map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DepsApiService {
  api = inject(ApiClient)

  getDeps(projectId: string): Observable<{ items: DepItem[]; meta: DepsResp['meta'] }> {
    return this.api.get<DepsResp>(`/api/deps/list/${projectId}`).pipe(
      map((res) => {
        const items: DepItem[] = [
          ...res.dependencies.map((x) => ({ ...x, group: "dependencies" as const })),
          ...res.devDependencies.map((x) => ({ ...x, group: "devDependencies" as const })),
        ];
        return { items, meta: res.meta };
      })
    );
  }

  install(projectId: string, body: { name: string; group: DepGroup; target: "required" | "latest" | "custom"; version?: string }) {
    return this.api.post(`/api/deps/install/${projectId}`, body);
  }

  uninstall(projectId: string, body: { name: string; group: DepGroup }) {
    return this.api.post(`/api/deps/uninstall/${projectId}`, body);
  }

  installDevtools(projectId: string) {
    return this.api.post(`/api/deps/devtools/install/${projectId}`, { tool: "devtools" });
  }
}
