import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';

import { API_BASE_URL, ApiClientService, type ApiSuccessResponse } from '@core/http';
import type {
  SkillCommentEntity,
  SkillDetailEntity,
  SkillDiscoveryMeta,
  SkillExportConfig,
  SkillExportTarget,
  SkillListResult,
  SkillQuery,
  SkillUploadInput,
  SkillVersionEntity,
} from '../models/skill-hub.model';

@Injectable({ providedIn: 'root' })
export class SkillHubApiService {
  private readonly api = inject(ApiClientService);
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  list(query: Partial<SkillQuery>) {
    return this.api.get<SkillListResult>('/skills', query);
  }

  meta(query: Partial<SkillQuery>) {
    return this.api.get<SkillDiscoveryMeta>('/skills/meta', query);
  }

  getById(skillId: string) {
    return this.api.get<SkillDetailEntity>(`/skills/${skillId}`);
  }

  create(input: SkillUploadInput) {
    return this.http
      .post<ApiSuccessResponse<SkillDetailEntity>>(`${this.baseUrl}/skills`, this.buildFormData(input), {
        withCredentials: true,
      })
      .pipe(map((response) => response.data));
  }

  createVersion(skillId: string, input: SkillUploadInput) {
    return this.http
      .post<ApiSuccessResponse<SkillDetailEntity>>(`${this.baseUrl}/skills/${skillId}/versions`, this.buildFormData(input), {
        withCredentials: true,
      })
      .pipe(map((response) => response.data));
  }

  submit(skillId: string, versionId: string) {
    return this.api.post<SkillVersionEntity>(`/skills/${skillId}/versions/${versionId}/submit`);
  }

  publish(skillId: string, versionId: string) {
    return this.api.post<SkillDetailEntity>(`/skills/${skillId}/versions/${versionId}/publish`);
  }

  reject(skillId: string, versionId: string, reviewComment: string) {
    return this.api.post<SkillVersionEntity, { reviewComment: string }>(`/skills/${skillId}/versions/${versionId}/reject`, {
      reviewComment,
    });
  }

  archive(skillId: string) {
    return this.api.post<SkillDetailEntity>(`/skills/${skillId}/archive`);
  }

  deleteSkill(skillId: string) {
    return this.api.delete<{ id: string }>(`/skills/${skillId}`);
  }

  deleteDraft(skillId: string) {
    return this.deleteSkill(skillId);
  }

  setFavorite(skillId: string, favorite: boolean) {
    return this.api.post<SkillDetailEntity, { favorite: boolean }>(`/skills/${skillId}/favorite`, { favorite });
  }

  review(skillId: string, rating: number, comment = '') {
    return this.api.post<SkillDetailEntity, { rating: number; comment?: string }>(`/skills/${skillId}/review`, {
      rating,
      comment,
    });
  }

  listComments(skillId: string) {
    return this.api.get<{ items: SkillCommentEntity[] }>(`/skills/${skillId}/comments`);
  }

  createComment(skillId: string, content: string) {
    return this.api.post<SkillCommentEntity, { content: string }>(`/skills/${skillId}/comments`, { content });
  }

  exportConfig(skillId: string, versionId: string, target: SkillExportTarget) {
    return this.api.get<SkillExportConfig>(`/skills/${skillId}/versions/${versionId}/export`, { target });
  }

  downloadUrl(skillId: string, versionId: string): string {
    const params = new HttpParams().set('t', String(Date.now()));
    return `${this.baseUrl}/skills/${skillId}/versions/${versionId}/download?${params.toString()}`;
  }

  private buildFormData(input: SkillUploadInput): FormData {
    const form = new FormData();
    form.append('file', input.file);
    this.appendIfPresent(form, 'name', input.name);
    this.appendIfPresent(form, 'version', input.version);
    this.appendIfPresent(form, 'category', input.category);
    this.appendIfPresent(form, 'tags', input.tags);
    this.appendIfPresent(form, 'descriptionMd', input.descriptionMd);
    return form;
  }

  private appendIfPresent(form: FormData, key: string, value: string | undefined): void {
    const normalized = value?.trim();
    if (normalized) {
      form.append(key, normalized);
    }
  }
}

