import { inject, Injectable } from '@angular/core';
import { ApiClient } from '@app/core/api';
import { ProjectAssets } from '@models/project.model';
import { SpriteConfig } from '@models/sprite.model';
import { GenerateSpriteOptions, SvnCheckoutOptions } from '../models';
import { SvnSyncResult } from '@models/svn.model';

@Injectable({
  providedIn: 'root',
})
export class SpriteApiService {
  private api = inject(ApiClient);

  generate(projectId: string, options: GenerateSpriteOptions) {
    return this.api.post(`/api/sprite/generate/${projectId}`, options);
  }

  getConfig(projectId: string) {
    return this.api.get<{ cfg: SpriteConfig | null, projectId: string }>(`/api/sprite/config/${projectId}`);
  }

  createConfig(projectId: string, assets: ProjectAssets, config: Omit<SpriteConfig, "projectId" | "updatedAt">) {
    return this.api.post<{ cfg: SpriteConfig | null, projectId: string }>(`/api/sprite/config/${projectId}`, { config, assets });
  }

  checkout(projectId: string, options: SvnCheckoutOptions) {
    return this.api.post<SvnSyncResult[]>(`/api/svn/sync/${projectId}`, options);
  }

}
