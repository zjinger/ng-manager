import { computed, inject, Injectable } from '@angular/core';
import { ProjectContextStore } from '@app/core/stores';
import { ProjectAssets } from '@models/project.model';
import { SpriteConfig, SpriteSnapshot } from '@models/sprite.model';
import { SvnRuntime, SvnSyncResult } from '@models/svn.model';
import { firstValueFrom } from 'rxjs';
import { SvnCheckoutOptions } from '../models';
import { SpriteApiService } from './sprite-api.service';

@Injectable({
  providedIn: 'root',
})
export class SpriteStateService {
  private projectContext = inject(ProjectContextStore)
  private api = inject(SpriteApiService)

  project = computed(() => {
    return this.projectContext.currentProject()
  })

  async loadConfig(): Promise<SpriteConfig | null> {
    if (!this.project()) {
      throw new Error("No project selected");
    }
    const projectId = this.project()!.id;
    return await firstValueFrom(this.api.getConfig(projectId));
  }

  async createConfig(assets: ProjectAssets, config: Omit<SpriteConfig, "projectId" | "updatedAt">): Promise<SpriteConfig | null> {
    if (!this.project()) {
      throw new Error("No project selected");
    }
    const projectId = this.project()!.id;
    const data = await firstValueFrom(this.api.createConfig(projectId, assets, config));
    this.projectContext.patchProject(data.project);  // 更新项目状态以反映新的资产配置
    return data.cfg;
  }

  async checkout(options: SvnCheckoutOptions = {}): Promise<SvnSyncResult[]> {
    const projectId = this.ensureProjectId();
    return await firstValueFrom(this.api.checkout(projectId, options));
  }

  async streamCheckout(options: SvnCheckoutOptions = {}): Promise<void> {
    const projectId = this.ensureProjectId();
    return await firstValueFrom(this.api.streamCheckout(projectId, options));
  }

  async getSvnRuntimes(): Promise<SvnRuntime[]> {
    const projectId = this.ensureProjectId();
    return await firstValueFrom(this.api.getRuntimes(projectId));
  }

  async generate(): Promise<SpriteSnapshot> {
    const projectId = this.ensureProjectId();
    return await firstValueFrom(this.api.generate(projectId));
  }

  async getSprites(): Promise<SpriteSnapshot> {
    const projectId = this.ensureProjectId();
    return await firstValueFrom(this.api.getSprites(projectId));
  }

  private ensureProjectId(): string {
    const project = this.project();
    if (!project) {
      throw new Error("No project selected");
    }
    return project.id;
  }

}
