import { computed, inject, Injectable, signal } from '@angular/core';
import { Project } from '@models/project.model';
import { ProjectService } from './project.service';
import { UiNotifierService } from '@app/core/ui-notifier.service';

@Injectable({
  providedIn: 'root',
})
export class ProjectStateService {
  private notify = inject(UiNotifierService);
  private projectService = inject(ProjectService);
  currentProjectId = signal<string | null>(null);
  currentProject = signal<Project | null>(null);
  projects = signal<Project[]>([]);

  openCurrentInEditor() {
    const p = this.currentProject();
    if (!p) return;
    this.projectService.openInEditor(p.id).subscribe({
      next: () => {
        this.notify.success("已在编辑器中打开项目");
      },
      // error: (e) => console.error("openInEditor failed:", e),
    });
  }

  toggleFavorite(projectId: string) {
    this.projectService.toggleFavorite(projectId).subscribe((updated) => {
      // 更新 projects 列表
      this.projects.update(list => list.map(p => (p.id === updated.id ? updated : p)));
      // 如果当前项目就是它，也同步
      this.projectChanged(updated);
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
  favoriteProjects = computed(() => {
    return this.projects().filter(p => p.isFavorite);
  });

  moreProjects = computed(() => {
    return this.projects().filter(p => !p.isFavorite);
  });

  getProjectById(projectId: string): Project | null {
    return this.projects().find(p => p.id === projectId) || null;
  }

  setCurrentProject(project: Project | null) {
    this.currentProject.set(project);
    this.currentProjectId.set(project ? project.id : null);
  }

  setCurrentProjectById(projectId: string) {
    const project = this.getProjectById(projectId);
    this.setCurrentProject(project);
  }

  projectChanged(project: Project) {
    if (this.currentProjectId() === project.id) {
      this.currentProject.set(project);
    }
  }


}
