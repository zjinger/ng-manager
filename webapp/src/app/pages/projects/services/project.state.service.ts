import { computed, inject, Injectable, signal } from '@angular/core';
import { Project } from '@models/project.model';
import { ProjectService } from './project.service';

@Injectable({
  providedIn: 'root',
})
export class ProjectStateService {
  private projectService = inject(ProjectService);
  currentProjectId = signal<string | null>(null);
  currentProject = signal<Project | null>(null);
  projects = signal<Project[]>([]);

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
