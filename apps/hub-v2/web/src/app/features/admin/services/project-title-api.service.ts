import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { ApiClientService } from '@core/http';
import type { CreateProjectTitleInput, ProjectTitleEntity, UpdateProjectTitleInput } from '../models/project-title.model';

@Injectable({ providedIn: 'root' })
export class ProjectTitleApiService {
  private readonly api = inject(ApiClientService);

  listTitles(query: { keyword?: string; status?: string } = {}) {
    return this.api
      .get<{ items: ProjectTitleEntity[] }>('/project-titles', query)
      .pipe(map((response) => response.items));
  }

  createTitle(input: CreateProjectTitleInput) {
    return this.api.post<ProjectTitleEntity, CreateProjectTitleInput>('/project-titles', input);
  }

  updateTitle(titleId: string, input: UpdateProjectTitleInput) {
    return this.api.patch<ProjectTitleEntity, UpdateProjectTitleInput>(`/project-titles/${titleId}`, input);
  }

  deleteTitle(titleId: string) {
    return this.api.delete<{ id: string }>(`/project-titles/${titleId}`);
  }
}
