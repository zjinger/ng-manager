import { inject, Injectable, signal, computed } from '@angular/core';
import { Observable, map, of, switchMap, tap } from 'rxjs';

import { ApiClientService } from '@core/http';
import { AuthStore } from '@core/auth';
import { ProjectApiService } from '../../features/projects/services/project-api.service';
import type { ProjectSummary } from '../../features/projects/models/project.model';
import type { ProfileNotificationPrefs } from '../../features/profile/models/profile.model';

const STORAGE_KEY = 'hub-v2.current-project-id';
const PROJECT_SCOPE_STORAGE_KEY = 'hub-v2.project-scope-mode';
const INCLUDE_ARCHIVED_STORAGE_KEY = 'hub-v2.include-archived-projects';

export type ProjectScopeMode = 'all_accessible' | 'member_only';

@Injectable({ providedIn: 'root' })
export class ProjectContextStore {
  private readonly projectApi = inject(ProjectApiService);
  private readonly api = inject(ApiClientService);
  private readonly authStore = inject(AuthStore);

  private readonly projectsState = signal<ProjectSummary[]>([]);
  private readonly transientProjectIdState = signal<string | null>(null);
  private readonly currentProjectIdState = signal<string | null>(
    typeof localStorage === 'undefined' ? null : localStorage.getItem(STORAGE_KEY)
  );
  private readonly projectScopeModeState = signal<ProjectScopeMode>(
    typeof localStorage === 'undefined'
      ? 'member_only'
      : ((localStorage.getItem(PROJECT_SCOPE_STORAGE_KEY) as ProjectScopeMode | null) ?? 'member_only')
  );
  private readonly includeArchivedProjectsState = signal<boolean>(
    typeof localStorage === 'undefined' ? false : localStorage.getItem(INCLUDE_ARCHIVED_STORAGE_KEY) === '1'
  );
  private readonly notificationPrefsState = signal<ProfileNotificationPrefs | null>(null);

  readonly projects = computed(() => this.sortProjects(this.projectsState()));
  readonly currentProjectId = computed(() => this.currentProjectIdState());
  readonly projectScopeMode = computed(() => this.projectScopeModeState());
  readonly includeArchivedProjects = computed(() => this.includeArchivedProjectsState());
  readonly currentProject = computed(
    () => this.projectsState().find((item) => item.id === this.currentProjectIdState()) ?? null
  );
  readonly currentProjectKey = computed(() => this.currentProject()?.projectKey ?? null);
  // 是否已归档
  readonly currentProjectIsArchived = computed(() => this.currentProject()?.status === 'inactive');
  // 是否active
  readonly currentProjectIsActive = computed(() => this.currentProject()?.status === 'active');
  readonly notificationPrefs = computed(() => this.notificationPrefsState());
  readonly systemNotificationEnabled = computed(
    () => this.notificationPrefsState()?.channels['system_notification'] ?? true
  );



  loadProjects(options?: { refreshScope?: boolean }) {
    const source$ = options?.refreshScope ? this.loadScopeFromServer() : of(this.projectScopeModeState());
    return source$.pipe(
      switchMap((scopeMode) =>
        this.projectApi.listAccessible(scopeMode, { includeArchived: this.includeArchivedProjectsState() })
      ),
      tap((items) => {
        const currentId = this.currentProjectIdState();
        const transientId = this.transientProjectIdState();
        const transientProject = transientId ? this.projectsState().find((item) => item.id === transientId) : null;
        const nextItems =
          transientProject && !items.some((item) => item.id === transientProject.id)
            ? [transientProject, ...items]
            : items;
        this.projectsState.set(nextItems);
        const exists = nextItems.some((item) => item.id === currentId);
        const nextProjectId = exists ? currentId : (items[0]?.id ?? null);
        this.setCurrentProjectId(nextProjectId, { persist: nextProjectId !== transientId });
      })
    );
  }

  setTransientCurrentProject(project: ProjectSummary): void {
    const exists = this.projectsState().some((item) => item.id === project.id);
    if (exists) {
      this.projectsState.update((items) => items.map((item) => (item.id === project.id ? project : item)));
      this.setCurrentProjectId(project.id);
      return;
    }

    this.transientProjectIdState.set(project.id);
    this.projectsState.update((items) => {
      const withoutCurrent = items.filter((item) => item.id !== project.id);
      return [project, ...withoutCurrent];
    });
    this.setCurrentProjectId(project.id, { persist: false });
  }

  patchProject(project: ProjectSummary): void {
    this.projectsState.update((items) => {
      const index = items.findIndex((item) => item.id === project.id);
      if (index < 0) {
        return items;
      }
      return items.map((item) =>
        item.id === project.id
          ? {
              ...item,
              ...project,
              favoriteAt: Object.prototype.hasOwnProperty.call(project, 'favoriteAt') ? project.favoriteAt : item.favoriteAt,
            }
          : item
      );
    });
  }

  clearTransientCurrentProject(): void {
    const transientId = this.transientProjectIdState();
    if (!transientId) return;

    const nextProjects = this.projectsState().filter((item) => item.id !== transientId);
    this.transientProjectIdState.set(null);
    this.projectsState.set(nextProjects);

    if (this.currentProjectIdState() !== transientId) return;

    const persistedId = typeof localStorage === 'undefined' ? null : localStorage.getItem(STORAGE_KEY);
    const fallbackId = nextProjects.find((item) => item.id === persistedId)?.id ?? nextProjects[0]?.id ?? null;
    this.setCurrentProjectId(fallbackId);
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

  setCurrentProjectId(projectId: string | null, options?: { persist?: boolean }): void {
    const persist = options?.persist ?? true;
    this.currentProjectIdState.set(projectId);
    if (projectId && projectId !== this.transientProjectIdState()) {
      this.transientProjectIdState.set(null);
    }
    if (!persist) {
      return;
    }
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
    this.setProjectScopeMode('member_only');
    this.setIncludeArchivedProjects(false);
  }

  private loadScopeFromServer(): Observable<ProjectScopeMode> {
    return this.api.get<ProfileNotificationPrefs>('/profile/preferences').pipe(
      map((prefs): ProjectScopeMode => {
        this.notificationPrefsState.set(prefs);
        const mode: ProjectScopeMode = this.hasGlobalProjectAccess()
          ? 'all_accessible'
          : (prefs?.projectScopeMode === 'all_accessible' ? 'all_accessible' : 'member_only');
        this.setProjectScopeMode(mode);
        if (typeof prefs?.includeArchivedProjects === 'boolean') {
          this.setIncludeArchivedProjects(prefs.includeArchivedProjects);
        }
        return mode;
      })
    );
  }

  private hasGlobalProjectAccess(): boolean {
    const permissions = this.authStore.currentUser()?.permissionCodes ?? [];
    return permissions.includes('project.read.all') || permissions.includes('project.manage.all');
  }

  private sortProjects(items: ProjectSummary[]): ProjectSummary[] {
    return items
      .map((item, index) => ({ item, index }))
      .sort((a, b) => {
        const aFavorite = a.item.favoriteAt;
        const bFavorite = b.item.favoriteAt;
        if (aFavorite && bFavorite && aFavorite !== bFavorite) {
          return bFavorite.localeCompare(aFavorite);
        }
        if (aFavorite && !bFavorite) {
          return -1;
        }
        if (!aFavorite && bFavorite) {
          return 1;
        }
        return this.compareDefaultProjectOrder(a.item, b.item) || a.index - b.index;
      })
      .map(({ item }) => item);
  }

  private compareDefaultProjectOrder(a: ProjectSummary, b: ProjectSummary): number {
    const created = b.createdAt.localeCompare(a.createdAt);
    if (created !== 0) {
      return created;
    }
    return b.updatedAt.localeCompare(a.updatedAt);
  }
}
