import { inject, Injectable, signal, computed } from '@angular/core';
import { tap } from 'rxjs';

import { ProjectApiService } from '../../features/projects/services/project-api.service';
import type { ProjectSummary } from '../../features/projects/models/project.model';

const STORAGE_KEY = 'hub-v2.current-project-id';

@Injectable({ providedIn: 'root' })
export class ProjectContextStore {
  private readonly projectApi = inject(ProjectApiService);

  private readonly projectsState = signal<ProjectSummary[]>([]);
  private readonly currentProjectIdState = signal<string | null>(
    typeof localStorage === 'undefined' ? null : localStorage.getItem(STORAGE_KEY)
  );

  readonly projects = computed(() => this.projectsState());
  readonly currentProjectId = computed(() => this.currentProjectIdState());
  readonly currentProject = computed(
    () => this.projectsState().find((item) => item.id === this.currentProjectIdState()) ?? null
  );

  loadProjects() {
    return this.projectApi.listAccessible().pipe(
      tap((items) => {
        this.projectsState.set(items);
        const currentId = this.currentProjectIdState();
        const exists = items.some((item) => item.id === currentId);
        this.setCurrentProjectId(exists ? currentId : (items[0]?.id ?? null));
      })
    );
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
  }
}
