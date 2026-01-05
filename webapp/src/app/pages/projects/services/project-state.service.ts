import { inject, Injectable, signal } from '@angular/core';
import { Project } from '@models/project.model';
import { ProjectService } from './project.service';

@Injectable({
  providedIn: 'root',
})
export class ProjectStateService {
  private projectService = inject(ProjectService);
  private _curProjectId = signal<string | null>(null);
  private _currProject = signal<Project | null>(null);
  private _projects = signal<Project[]>([]);

  getProjects() {
    this.projectService.list().subscribe((data: Project[]) => {
      this._projects.set(data);
      if (data.length > 0 && !this._curProjectId()) {
        this.setCurrentProject(data[0]);
      }
    });
  }

  get currentProject() {
    return this._currProject();
  }

  get projects() {
    return this._projects();
  }

  getFavoriteProjects() {
    return this._projects().filter(p => p.isFavorite);
  }

  getMoreProjects() {
    return this._projects().filter(p => !p.isFavorite);
  }

  getProjectById(projectId: string): Project | null {
    return this._projects().find(p => p.id === projectId) || null;
  }

  setCurrentProject(project: Project | null) {
    this._currProject.set(project);
    this._curProjectId.set(project ? project.id : null);
  }

  setCurrentProjectById(projectId: string) {
    const project = this.getProjectById(projectId);
    this.setCurrentProject(project);
  }

  projectChanged(project: Project) {
    if (this._curProjectId() === project.id) {
      this._currProject.set(project);
    }
  }
}
