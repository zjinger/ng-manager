import { inject, Injectable } from '@angular/core';
import { ApiClient } from '@app/core/api';
import { Project, ProjectMemberEntity } from '@models/project.model';

@Injectable({
  providedIn: 'root',
})
export class ProjectContextApiService {
  private api = inject(ApiClient);

  // 获取项目列表
  list() {
    return this.api.get<Project[]>('/api/projects/list');
  }

  // 从hub-v2中获取项目成员
  getProjectMembers(projectId: string) {
    return this.api.hubRequestWithPrjId<{ items: ProjectMemberEntity[] }>({
      projectId: projectId,
      path: '/members',
    });
  }
}
