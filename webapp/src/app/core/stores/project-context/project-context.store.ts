import { computed, inject, Injectable, signal } from '@angular/core';
import { LocalStateStore } from '../../local-state/local-state.store';
import { Project, ProjectMemberEntity } from '@models/project.model';
import { LS_KEYS } from '../../local-state';
import { Router } from '@angular/router';
import { ProjectContextApiService } from './project-context-api.service';
import { tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ProjectContextStore {
  private ls = inject(LocalStateStore);
  private projectApi = inject(ProjectContextApiService);
  private router = inject(Router);

  private currentProjectState = signal<Project | null>(null);
  private projectsState = signal<Project[]>([]);
  // HUB V2 项目members
  private membersState = signal<ProjectMemberEntity[]>([]);

  projects = computed(() => this.projectsState());
  currentProject = computed(() => this.currentProjectState());
  currentProjectId = computed(() => this.currentProjectState()?.id || null);

  /* ---------------- HUB V2 EVN ------------------------*/
  currentProjectKey = computed(() => this.currentProjectState()?.env?.['NGM_HUB_V2_PROJECT_KEY']);
  currentProjectToken = computed(() => this.currentProjectState()?.env?.['NGM_HUB_V2_TOKEN']);
  currentProjectMembers = computed(() => this.membersState());
  isHubProjectValid = computed(() => {
    return !!(
      this.currentProjectState()?.env?.['NGM_HUB_V2_PROJECT_KEY'] &&
      this.currentProjectState()?.env?.['NGM_HUB_V2_TOKEN']
    );
  });

  /* ---------------- list ------------------------ */
  favoriteProjects = computed(() => this.projects().filter((p) => p.isFavorite));
  recentProjects = computed(() =>
    this.projects()
      .slice()
      .sort((a, b) => {
        const dateA = new Date(a.lastOpened || 0).getTime();
        const dateB = new Date(b.lastOpened || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 5),
  );

  /* ---------------- setter ------------------------ */
  setProjects(projects: Project[]) {
    this.projectsState.set(projects);
  }

  setCurrentProject(project: Project | null) {
    this.currentProjectState.set(project);
    const id = project ? project.id : null;

    if (id) this.ls.set(LS_KEYS.project.currentProjectId, id);
    else this.ls.remove(LS_KEYS.project.currentProjectId);
  }

  setCurrentProjectById(projectId: string) {
    const project = this.projects().find((p) => p.id === projectId) || null;
    this.setCurrentProject(project);
  }

  private setMembers(members: ProjectMemberEntity[]) {
    this.membersState.set(members);
  }

  /** 更新已经在列表中的项目(包括列表和当前选中) */
  patchProject(updated: Project) {
    this.projectsState.update((list) => list.map((p) => (p.id === updated.id ? updated : p)));
    if (this.currentProjectId() === updated.id) {
      this.currentProjectState.set(updated);
    }
  }

  removeProject(projectId: string) {
    this.projectsState.update((list) => list.filter((p) => p.id !== projectId));

    if (this.currentProjectId() === projectId) {
      const next = this.projectsState()[0] || null;
      this.setCurrentProject(next);
    }
  }

  /* ---------------- getter ------------------------ */
  getProjectById(projectId: string): Project | null {
    return this.projectsState().find((p) => p.id === projectId) || null;
  }

  isOpen(project: Project): boolean {
    return this.currentProjectId() === project.id;
  }

  /* ---------------- init ------------------------ */
  async loadProjectMembers(projectId: string) {
    try {
      const members = (await this.projectApi.getProjectMembers(projectId)).items;
      this.setMembers(members);
    } catch (e) {
      this.setMembers([]);
    }
  }

  loadProjects(preferredId?: string) {
    // 返回 Observable（不要在这里 subscribe）
    return this.projectApi.list().pipe(
      tap((projects) => {
        this.setProjects(projects);
        this.initCurrentProject(projects, preferredId);
      }),
    );
  }

  private initCurrentProject(projects: Project[], preferredId?: string) {
    if (!projects.length) {
      this.setCurrentProject(null);
      return;
    }

    if (preferredId) {
      const found = projects.find((p) => p.id === preferredId);
      if (found) {
        this.setCurrentProject(found);
        return;
      }
    }

    const cachedId = this.ls.getNullable<string>(LS_KEYS.project.currentProjectId);
    const cached = cachedId ? projects.find((p) => p.id === cachedId) : null;

    if (cached) {
      this.setCurrentProject(cached);
      return;
    }

    this.setCurrentProject(projects[0]);
  }
}
