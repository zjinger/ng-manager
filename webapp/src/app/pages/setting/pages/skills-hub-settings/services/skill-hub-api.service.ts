import { inject, Injectable } from '@angular/core';
import { catchError, from, of } from 'rxjs';
import { ApiClient } from '@app/core/api';
import { LocalStateStore, LS_KEYS } from '@app/core/local-state';
import { ProjectContextStore } from '@app/core/stores';
import type { SkillDetailEntity, SkillListResult, SkillQuery } from '../models/skill-hub.model';

@Injectable({ providedIn: 'root' })
export class SkillHubApiService {
  private readonly apiClient = inject(ApiClient);
  private readonly projectContext = inject(ProjectContextStore);
  private readonly ls = inject(LocalStateStore);

  private get projectId(): string {
    return this.projectContext.currentProjectId()!;
  }

  list(query: Partial<SkillQuery>) {
    return from(
      this.apiClient.hubRequestWithPersonalToken<SkillListResult>({
        projectId: this.projectId,
        path: '/skills',
        method: 'GET',
        query: query as Record<string, any>,
      }),
    )
  }

  getById(skillId: string) {
    return from(
      this.apiClient.hubRequestWithPersonalToken<SkillDetailEntity>({
        projectId: this.projectId,
        path: `/skills/${skillId}`,
        method: 'GET',
      }),
    )
  }

  download(skillId: string, versionId: string) {
    const base = `/api/client/hub-token/skills/${skillId}/versions/${versionId}/download`;
    const personalToken = this.ls.get<string>(LS_KEYS.token.hubV2PersonalToken, '').trim();
    const url = personalToken ? `${base}?personalToken=${encodeURIComponent(personalToken)}` : base;

    return from(
      fetch(url, { credentials: 'same-origin' })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Download failed: ${response.status}`);
          }
          const disposition = response.headers.get('content-disposition');
          const fileName = disposition
            ? disposition.split('filename*=UTF-8\'\'')[1] || disposition.split('filename="')[1]?.split('"')[0]
            : `skill-${skillId}-${versionId}.zip`;
          return response.blob().then((blob) => ({ blob, fileName: decodeURIComponent(fileName) }));
        })
        .then(({ blob, fileName }) => {
          const objectUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = objectUrl;
          a.download = fileName;
          a.click();
          URL.revokeObjectURL(objectUrl);
        }),
    );
  }
}
