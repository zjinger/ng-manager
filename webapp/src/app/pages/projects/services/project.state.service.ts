import { computed, inject, Injectable, signal } from '@angular/core';
import { Project } from '@models/project.model';
import { ProjectApiService } from './project-api.service';
import { UiNotifierService } from '@core/ui-notifier.service';
import { NzModalService } from 'ng-zorro-antd/modal';
@Injectable({ providedIn: 'root' })
export class ProjectStateService {
  private modal = inject(NzModalService);
  private notify = inject(UiNotifierService);
  private projectService = inject(ProjectApiService);

  currentProjectId = signal<string | null>(null);
  currentProject = signal<Project | null>(null);
  projects = signal<Project[]>([]);

  /* ----------------- edit modal state ----------------- */
  isEditModalVisible = signal(false);
  isEditSaving = signal(false);
  editingProjectId = signal<string | null>(null);
  editingProjectName = signal<string>('');

  /* ----------------- list computed ----------------- */
  favoriteProjects = computed(() => this.projects().filter(p => p.isFavorite));
  moreProjects = computed(() => this.projects().filter(p => !p.isFavorite));
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
    // 本地立即更新（UI 立刻有反馈）
    this.projects.update(list =>
      list.map(p => (p.id === project.id ? { ...p, lastOpened } : p))
    );
    this.currentProject.update(p => (p ? { ...p, lastOpened } : p));
    // 异步落库
    this.projectService.setLastOpened(project.id, lastOpened).subscribe();
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

  getProjects() {
    this.projectService.list().subscribe((data: Project[]) => {
      this.projects.set(data);
      if (data.length > 0 && !this.currentProjectId()) {
        this.setCurrentProject(data[0]);
      }
    });
  }

  getProjectById(projectId: string): Project | null {
    return this.projects().find(p => p.id === projectId) || null;
  }


  setCurrentProject(project: Project | null) {
    this.currentProject.set(project);
    this.currentProjectId.set(project ? project.id : null);
  }

  setCurrentProjectById(projectId: string) {
    const project = this.projects().find(p => p.id === projectId) || null;
    this.setCurrentProject(project);
  }

  isOpen(project: Project): boolean {
    return this.currentProjectId() === project.id;
  }

  /* ----------------- rename modal ----------------- */
  /** 打开重命名弹窗：默认带入当前名称 */
  openEditModal(project: Project) {
    this.editingProjectId.set(project.id);
    this.editingProjectName.set(project.name ?? '');
    this.isEditModalVisible.set(true);
  }

  closeEditModal() {
    if (this.isEditSaving()) return; // 防止保存中被关掉
    this.isEditModalVisible.set(false);
    this.editingProjectId.set(null);
    this.editingProjectName.set('');
  }

  confirmEditProject() {
    const id = this.editingProjectId();
    const name = this.editingProjectName().trim();

    if (!id) {
      this.notify.error('未选中需要重命名的项目');
      return;
    }
    if (!name) return;

    const current = this.getProjectById(id);
    if (current && current.name === name) {
      this.closeEditModal();
      return;
    }

    this.isEditSaving.set(true);
    this.projectService.rename(id, name).subscribe({
      next: (updated) => {
        this.isEditSaving.set(false);
        this.patchProject(updated);
        this.notify.success('重命名成功');
        this.closeEditModal();
      },
      error: (err) => {
        this.notify.error(err?.message || '重命名失败');
        this.isEditSaving.set(false);
      },
      complete: () => {
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

