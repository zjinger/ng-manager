import { computed, inject, Injectable, signal } from '@angular/core';
import { EditingProjectDraft, Project } from '@models/project.model';
import { ProjectApiService } from './project-api.service';
import { UiNotifierService } from '@core/ui-notifier.service';
import { NzModalService } from 'ng-zorro-antd/modal';
import { LocalStateStore, LS_KEYS } from '@core/local-state';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class ProjectStateService {
  private modal = inject(NzModalService);
  private notify = inject(UiNotifierService);
  private projectService = inject(ProjectApiService);
  private ls = inject(LocalStateStore);
  private router = inject(Router);

  currentProjectId = signal<string | null>(null);
  currentProject = signal<Project | null>(null);
  projects = signal<Project[]>([]);

  keyword = signal<string>('');

  /* ----------------- edit modal state ----------------- */
  isEditModalVisible = signal(false);
  isEditSaving = signal(false);
  /* 正在编辑的项目 */
  editingProject = signal<EditingProjectDraft | null>(null);

  /* ----------------- list computed ----------------- */
  filteredProjects = computed(() => {
    const kw = this.keyword().trim().toLowerCase();
    if (!kw) return this.projects();
    return this.projects().filter(p => p.name.toLowerCase().includes(kw));
  });
  favoriteProjects = computed(() => this.filteredProjects().filter(p => p.isFavorite));
  moreProjects = computed(() => this.filteredProjects().filter(p => !p.isFavorite));
  recentProjects = computed(() =>
    this.projects()
      .slice()
      .sort((a, b) => {
        const dateA = new Date(a.lastOpened || 0).getTime();
        const dateB = new Date(b.lastOpened || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 5)
  );

  /** 点击列表项：切换当前项目 + 记录 lastOpened */
  selectProject(project: Project) {
    this.setCurrentProject(project);
    const lastOpened = Date.now();
    this.projects.update(list =>
      list.map(p => (p.id === project.id ? { ...p, lastOpened } : p))
    );
    this.currentProject.update(p => (p ? { ...p, lastOpened } : p));
    // 异步落库
    this.projectService.setLastOpened(project.id, lastOpened).subscribe();

    this.router.navigate(['/dashboard']);
  }

  /** 用于服务端返回的更新（比如 toggleFavorite） */
  patchProject(updated: Project) {
    this.projects.update(list => list.map(p => (p.id === updated.id ? updated : p)));
    if (this.currentProjectId() === updated.id) {
      this.currentProject.set(updated);
    }
  }

  openInEditor(projectId: string) {
    this.projectService.openInEditor(projectId).subscribe({
      next: () => {
        console.log('Opened project in editor:', projectId);
        this.notify.success('已在编辑器中打开项目');
      },
    });
  }

  toggleFavorite(projectId: string) {
    this.projectService.toggleFavorite(projectId).subscribe(updated => {
      this.patchProject(updated);
    });
  }

  getProjects(currentProjectId?: string) {
    this.projectService.list().subscribe((data: Project[]) => {
      this.projects.set(data);
      if (!data.length) {
        this.setCurrentProject(null);
        return;
      }

      if (currentProjectId) {
        this.setCurrentProjectById(currentProjectId);
      }
      else {
        const cachedId = this.ls.getNullable<string>(LS_KEYS.project.currentProjectId);
        const cached = cachedId ? data.find(p => p.id === cachedId) : null;
        if (cached) {
          this.setCurrentProject(cached);
          return;
        }
        if (!this.currentProjectId()) {
          this.setCurrentProject(data[0]);
        }
      }
    });
  }

  getProjectById(projectId: string): Project | null {
    return this.projects().find(p => p.id === projectId) || null;
  }

  setCurrentProject(project: Project | null) {
    this.currentProject.set(project);
    const id = project ? project.id : null;
    this.currentProjectId.set(id);

    if (id) this.ls.set(LS_KEYS.project.currentProjectId, id);
    else this.ls.remove(LS_KEYS.project.currentProjectId);
  }

  setCurrentProjectById(projectId: string) {
    const project = this.projects().find(p => p.id === projectId) || null;
    this.setCurrentProject(project);
  }

  isOpen(project: Project): boolean {
    return this.currentProjectId() === project.id;
  }

  getHubV2PersonalToken(): string {
    return this.ls.get<string>(LS_KEYS.token.hubV2PersonalToken, '').trim();
  }

  hasHubV2PersonalToken(): boolean {
    return !!this.getHubV2PersonalToken();
  }

  setHubV2PersonalToken(token: string): void {
    const nextToken = token.trim();
    if (nextToken) {
      this.ls.set(LS_KEYS.token.hubV2PersonalToken, nextToken);
      return;
    }
    this.ls.remove(LS_KEYS.token.hubV2PersonalToken);
  }

  /* ----------------- rename modal ----------------- */
  /** 打开重命名弹窗：默认带入当前名称 */
  openEditModal(project: Project) {
    const env = project.env ?? {};
    this.editingProject.set({
      id: project.id,
      name: project.name ?? '',
      repoPageUrl: project.repoPageUrl ?? '',
      description: project.description ?? '',
      hubV2: {
        baseUrl: env['NGM_HUB_V2_BASE_URL'] ?? '',
        projectKey: env['NGM_HUB_V2_PROJECT_KEY'] ?? '',
        token: env['NGM_HUB_V2_TOKEN'] ?? '',
      },
    });
    this.isEditModalVisible.set(true);
  }

  closeEditModal() {
    if (this.isEditSaving()) return;
    this.isEditModalVisible.set(false);
    this.editingProject.set(null);
  }

  confirmEditProject() {
    if (this.isEditSaving() || !this.editingProject()) return;
    const { id, name, description, repoPageUrl, hubV2 } = this.editingProject()!;

    if (!id) {
      this.notify.error('未选中需要重命名的项目');
      return;
    }
    if (!name) return;
    const desc = description?.trim();
    const repoPUrl = repoPageUrl?.trim();
    const nextHubV2 = {
      baseUrl: hubV2.baseUrl.trim(),
      projectKey: hubV2.projectKey.trim(),
      token: hubV2.token.trim(),
    };
    const current = this.getProjectById(id);
    const currentEnv = current?.env ?? {};
    if (
      current &&
      current.name === name &&
      current.description === desc &&
      current.repoPageUrl === repoPUrl &&
      (currentEnv['NGM_HUB_V2_BASE_URL'] ?? '') === nextHubV2.baseUrl &&
      (currentEnv['NGM_HUB_V2_PROJECT_KEY'] ?? '') === nextHubV2.projectKey &&
      (currentEnv['NGM_HUB_V2_TOKEN'] ?? '') === nextHubV2.token
    ) {
      this.closeEditModal();
      return;
    }

    this.isEditSaving.set(true);
    this.projectService.edit(id, { name, description: desc, repoPageUrl: repoPUrl, }).subscribe({
      next: () => {
        const nextEnv = {
          ...(current?.env ?? {}),
          NGM_HUB_V2_BASE_URL: nextHubV2.baseUrl,
          NGM_HUB_V2_PROJECT_KEY: nextHubV2.projectKey,
          NGM_HUB_V2_TOKEN: nextHubV2.token,
        };
        this.projectService.update(id, { env: nextEnv }).subscribe({
          next: (updated) => {
            this.patchProject(updated);
            this.notify.success('修改成功');
            this.closeEditModal();
            this.isEditSaving.set(false);
          },
          error: (err) => {
            this.notify.error(err?.message || '项目配置保存失败');
            this.isEditSaving.set(false);
          },
        });
      },
      error: (err) => {
        this.notify.error(err?.message || '修改失败');
        this.isEditSaving.set(false);
      },
    });
  }

  /** 删除项目 */
  deleteProject(projectId: string) {
    this.modal.confirm({
      nzTitle: '确认删除该项目吗？',
      nzContent: '删除项目只会移除项目记录，不会删除磁盘上的文件夹。如需删除磁盘文件，请手动操作。',
      nzOkText: '删除',
      nzCancelText: '取消',
      nzOkDanger: true,
      nzOnOk: () => {
        this.projectService.delete(projectId).subscribe({
          next: () => {
            this.projects.update(list => list.filter(p => p.id !== projectId));
            if (this.currentProjectId() === projectId) {
              // 删除的正是当前项目，切换到第一个
              const first = this.projects()[0] || null;
              this.setCurrentProject(first);
              if (!first) {
                this.notify.info('当前没有项目，请先创建或导入项目');
              }
            }
            this.notify.success('项目已删除');
          }
        });
      }

    });
  }
}

