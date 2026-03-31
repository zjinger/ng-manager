import { inject, Injectable, signal, computed } from '@angular/core';
import { Observable, map, of, switchMap, tap } from 'rxjs';

import { ApiClientService } from '@core/http';
import { ProjectApiService } from '../../features/projects/services/project-api.service';
import type { ProjectSummary } from '../../features/projects/models/project.model';

const STORAGE_KEY = 'hub-v2.current-project-id';
const PROJECT_SCOPE_STORAGE_KEY = 'hub-v2.project-scope-mode';
const INCLUDE_ARCHIVED_STORAGE_KEY = 'hub-v2.include-archived-projects';

export type ProjectScopeMode = 'all_accessible' | 'member_only';

type ProfilePreferencesResponse = {
  projectScopeMode?: ProjectScopeMode;
  includeArchivedProjects?: boolean;
};

@Injectable({ providedIn: 'root' })
export class ProjectContextStore {
  private readonly projectApi = inject(ProjectApiService);
  private readonly api = inject(ApiClientService);

  private readonly projectsState = signal<ProjectSummary[]>([]);
  private readonly currentProjectIdState = signal<string | null>(
    typeof localStorage === 'undefined' ? null : localStorage.getItem(STORAGE_KEY)
  );
  private readonly projectScopeModeState = signal<ProjectScopeMode>(
    typeof localStorage === 'undefined'
      ? 'all_accessible'
      : ((localStorage.getItem(PROJECT_SCOPE_STORAGE_KEY) as ProjectScopeMode | null) ?? 'all_accessible')
  );
  private readonly includeArchivedProjectsState = signal<boolean>(
    typeof localStorage === 'undefined' ? false : localStorage.getItem(INCLUDE_ARCHIVED_STORAGE_KEY) === '1'
  );

  readonly projects = computed(() => this.projectsState());
  readonly currentProjectId = computed(() => this.currentProjectIdState());
  readonly projectScopeMode = computed(() => this.projectScopeModeState());
  readonly includeArchivedProjects = computed(() => this.includeArchivedProjectsState());
  readonly currentProject = computed(
    () => this.projectsState().find((item) => item.id === this.currentProjectIdState()) ?? null
  );

  loadProjects(options?: { refreshScope?: boolean }) {
    const source$ = options?.refreshScope ? this.loadScopeFromServer() : of(this.projectScopeModeState());
    return source$.pipe(
      switchMap((scopeMode) =>
        this.projectApi.listAccessible(scopeMode, { includeArchived: this.includeArchivedProjectsState() })
      ),
      tap((items) => {
        this.projectsState.set(items);
        const currentId = this.currentProjectIdState();
        const exists = items.some((item) => item.id === currentId);
        this.setCurrentProjectId(exists ? currentId : (items[0]?.id ?? null));
      })
    );
  }

  setProjectScopeMode(mode: ProjectScopeMode): void {
    this.projectScopeModeState.set(mode);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(PROJECT_SCOPE_STORAGE_KEY, mode);
    }
  }

  refreshProjectScopeMode(mode: ProjectScopeMode): Observable<ProjectSummary[]> {
    this.setProjectScopeMode(mode);
    return this.loadProjects();
  }

  setIncludeArchivedProjects(enabled: boolean): void {
    this.includeArchivedProjectsState.set(enabled);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(INCLUDE_ARCHIVED_STORAGE_KEY, enabled ? '1' : '0');
    }
  }

  refreshIncludeArchivedProjects(enabled: boolean): Observable<ProjectSummary[]> {
    this.setIncludeArchivedProjects(enabled);
    return this.loadProjects();
  }

  setCurrentProjectId(projectId: string | null): void {
    this.currentProjectIdState.set(projectId);
    if (typeof localStorage !== 'undefined') {
      if (projectId) {
        localStorage.setItem(STORAGE_KEY, projectId);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }

  reset(): void {
    this.projectsState.set([]);
    this.setCurrentProjectId(null);
    this.setProjectScopeMode('all_accessible');
    this.setIncludeArchivedProjects(false);
  }

  private loadScopeFromServer(): Observable<ProjectScopeMode> {
    return this.api.get<ProfilePreferencesResponse>('/profile/preferences').pipe(
      map((prefs): ProjectScopeMode => {
        const mode: ProjectScopeMode = prefs?.projectScopeMode === 'member_only' ? 'member_only' : 'all_accessible';
        this.setProjectScopeMode(mode);
        if (typeof prefs?.includeArchivedProjects === 'boolean') {
          this.setIncludeArchivedProjects(prefs.includeArchivedProjects);
        }
        return mode;
      })
    );
  }
}
