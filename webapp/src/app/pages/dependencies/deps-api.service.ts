import { inject, Injectable } from '@angular/core';
import { ApiClient } from '@app/core';
import { DepItem, DepsResp } from '@models/deps.model';
import { ProjectNodeRequirement } from '@pages/tasks/node-version/node-version.service';
import type {
  InstallDepRequestDto,
  OkResponseDto,
  ProjectDepsResultDto,
  UninstallDepRequestDto,
} from '@yinuo-ngm/protocol';
import { map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DepsApiService {
  api = inject(ApiClient)

  getDeps(projectId: string): Observable<{ items: DepItem[]; meta: DepsResp['meta'] }> {
    return this.api.get<ProjectDepsResultDto>(`/api/deps/list/${projectId}`).pipe(
      map((res) => {
        const items: DepItem[] = [
          ...res.dependencies,
          ...res.devDependencies,
        ];
        return { items, meta: res.meta };
      })
    );
  }

  install(projectId: string, body: InstallDepRequestDto) {
    return this.api.post<OkResponseDto>(`/api/deps/install/${projectId}`, body);
  }

  uninstall(projectId: string, body: UninstallDepRequestDto) {
    return this.api.post<OkResponseDto>(`/api/deps/uninstall/${projectId}`, body);
  }

  installDevtools(projectId: string) {
    return this.api.post<OkResponseDto>(`/api/deps/devtools/install/${projectId}`, { tool: "devtools" });
  }

  
  /** 获取项目 Node 版本信息 */
  getProjectNodeInfo(projectPath: string): Observable<ProjectNodeRequirement> {
    return this.api.post(`/api/node-version/project-requirement`, { projectPath });
  }
}
