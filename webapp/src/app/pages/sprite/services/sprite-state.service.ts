import { computed, inject, Injectable } from '@angular/core';
import { ProjectAssets } from '@models/project.model';
import { SpriteConfig } from '@models/sprite.model';
import { ProjectStateService } from '@pages/projects/services/project.state.service';
import { firstValueFrom } from 'rxjs';
import { SpriteApiService } from './sprite-api.service';

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
    return data.cfg;
  }
}
