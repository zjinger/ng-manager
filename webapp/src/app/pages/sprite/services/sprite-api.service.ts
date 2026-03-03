import { inject, Injectable } from '@angular/core';
import { ApiClient } from '@app/core/api';
import { Project, ProjectAssets } from '@models/project.model';
import { SpriteBrowseResult, SpriteConfig, SpriteSnapshot } from '@models/sprite.model';
import { GenerateSpriteOptions, SvnCheckoutOptions } from '../models';
import { SvnRuntime, SvnSyncResult } from '@models/svn.model';
import { HttpParams } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class SpriteApiService {
  private api = inject(ApiClient);

  generate(projectId: string, options: GenerateSpriteOptions = {}) {
    return this.api.post<SpriteSnapshot>(`/api/sprite/generate/${projectId}`, options);
  }

  getConfig(projectId: string) {
    return this.api.get<SpriteConfig>(`/api/sprite/config/${projectId}`);
  }

  createConfig(projectId: string, assets: ProjectAssets, config: Omit<SpriteConfig, "projectId" | "updatedAt">) {
    return this.api.post<{ cfg: SpriteConfig | null, project: Project }>(`/api/sprite/config/${projectId}`, { config, assets });
  }

  checkout(projectId: string, options: SvnCheckoutOptions = {}) {
    return this.api.post<SvnSyncResult[]>(`/api/svn/sync/${projectId}`, options);
  }

  streamCheckout(projectId: string, options: SvnCheckoutOptions = {}) {
    return this.api.post<void>(`/api/svn/sync/stream/${projectId}`, options);
  }

  getRuntimes(projectId: string) {
    return this.api.get<SvnRuntime[]>(`/api/svn/runtime/${projectId}`);
  }

  getSprites(projectId: string) {
    return this.api.get<SpriteSnapshot>(`/api/sprite/list/${projectId}`);
  }

  browseIconGroups(projectId: string) {
    return this.api.get<SpriteBrowseResult>(`/api/sprite/browse/icons/groups/${projectId}`);
  }

  browseIconFiles(projectId: string, group: string) {
    const params = new HttpParams().set('group', group);
    return this.api.get<SpriteBrowseResult>(`/api/sprite/browse/icons/files/${projectId}`, params);
    // 如果你的 ApiClient 不支持 query 对象，就拼接 ?group=
  }

  browseImages(projectId: string, dir: string = '') {
    const params = new HttpParams().set('dir', dir);
    return this.api.get<SpriteBrowseResult>(`/api/sprite/browse/images/list/${projectId}`, params);
  }
}
