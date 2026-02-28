import { computed, inject, Injectable } from '@angular/core';
import { ProjectAssets } from '@models/project.model';
import { SpriteConfig } from '@models/sprite.model';
import { ProjectStateService } from '@pages/projects/services/project.state.service';
import { firstValueFrom } from 'rxjs';
import { SpriteApiService } from './sprite-api.service';
import { SvnCheckoutOptions } from '../models';
import { SvnRuntime, SvnSyncResult } from '@models/svn.model';

@Injectable({
  providedIn: 'root',
})
export class SpriteStateService {
  private projectState = inject(ProjectStateService)
  private api = inject(SpriteApiService)

  project = computed(() => {
    return this.projectState.currentProject()
  })

  async loadConfig(): Promise<SpriteConfig | null> {
    if (!this.project()) {
      throw new Error("No project selected");
    }
    const projectId = this.project()!.id;
    const data = await firstValueFrom(this.api.getConfig(projectId));
    return data.cfg;
  }

  async createConfig(assets: ProjectAssets, config: Omit<SpriteConfig, "projectId" | "updatedAt">): Promise<SpriteConfig | null> {
    if (!this.project()) {
      throw new Error("No project selected");
    }
    const projectId = this.project()!.id;
    const data = await firstValueFrom(this.api.createConfig(projectId, assets, config));
    this.projectState.patchProject(data.project); // 更新项目状态以反映新的资产配置
    return data.cfg;
  }

  async checkout(options: SvnCheckoutOptions = {}): Promise<SvnSyncResult[]> {
    if (!this.project()) {
      throw new Error("No project selected");
    }
    const projectId = this.project()!.id;
    return await firstValueFrom(this.api.checkout(projectId, options));
  }

  async streamCheckout(options: SvnCheckoutOptions = {}): Promise<void> {
    if (!this.project()) {
      throw new Error("No project selected");
    }
    const projectId = this.project()!.id;
    return await firstValueFrom(this.api.streamCheckout(projectId, options));
  }

  async getSvnRuntimes(): Promise<SvnRuntime[]> {
    if (!this.project()) {
      throw new Error("No project selected");
    }
    const projectId = this.project()!.id;
    return await firstValueFrom(this.api.getRuntimes(projectId));
  }


}
