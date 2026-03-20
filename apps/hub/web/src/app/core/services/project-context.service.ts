import { computed, inject, Injectable, signal } from '@angular/core';
import { HubApiService } from '../http/hub-api.service';
import { firstValueFrom } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';
import { ProjectItem } from '../../pages/projects/projects.model';

@Injectable({
  providedIn: 'root',
})
export class ProjectContextService {
  protected readonly hubApi = inject(HubApiService);
  protected readonly nzMsg = inject(NzMessageService);
  private readonly ID_STORAGE_KEY = 'ngmhub:project:currentProjectId';

  // 所有项目
  // private readonly _projects = signal<ProjectItem[]>([]);
  // public readonly projects = computed(() => this._projects());

  // 当前选中的项目ID
  private readonly projects = signal<ProjectItem[]>([]);
  private readonly _currentProjectId = signal<string | null>(null);

  public readonly allProjects = computed(() => this.projects());
  public readonly currentProject = computed(() =>
    this.projects().find((p) => p.id === this._currentProjectId()),
  );
  // 常规optoins
  public readonly projectOpts = computed(() => this.getProjectOptoins(this.projects()));

  public readonly projectUseKeyOpts = computed(() =>
    this.getProjectUserKeyOptoins(this.projects()),
  );

  /**
   * 设置当前项目id
   * @param projectId 项目ID
   * @param projectKey 项目Key，可选
   */
  setProject(projectId: string | null) {
    this._currentProjectId.set(projectId ?? null);

    if (projectId) {
      localStorage.setItem(this.ID_STORAGE_KEY, projectId);
    } else {
      localStorage.removeItem(this.ID_STORAGE_KEY);
    }
  }

  // 初始化项目列表（页面启动或刷新时调用）
  async loadProjects(): Promise<void> {
    if (this.projects().length > 0) return; // 已经加载过了
    try {
      const result = await firstValueFrom(
        this.hubApi.get<{ items: ProjectItem[] }>('/api/admin/projects', {
          params: { status: 'active', page: 1, pageSize: 100 },
        }),
      );
      const items = result.items;
      this.projects.set(items);
      this.setProject(this.readIdFromStorage());
    } catch (error) {
      this.nzMsg.error('获取项目列表失败');
    }
  }

  // 手动更新projects列表
  updateProjects(projects: ProjectItem[]) {
    this.projects.set(projects);
  }

  clear() {
    this.projects.set([]);
    this.setProject(null);
  }

  private getProjectOptoins(projects: ProjectItem[]): { label: string; value: string }[] {
    return projects.map((p) => ({ label: p.name, value: p.id }));
  }

  private getProjectUserKeyOptoins(projects: ProjectItem[]): { label: string; value: string }[] {
    return projects.map((p) => ({ label: p.name, value: p.projectKey }));
  }

  private readIdFromStorage(): string | null {
    return localStorage.getItem(this.ID_STORAGE_KEY);
  }
}
