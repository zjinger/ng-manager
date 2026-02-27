import { SpriteRepo } from "./sprite.repo";
import { SpriteService } from "./sprite.service";
import { SpriteConfig } from "./sprite.types";

export class SpriteServiceImpl implements SpriteService {
    constructor(private spriteRepo: SpriteRepo) {
    }
    async getConfig(projectId: string): Promise<SpriteConfig | null> {
        return this.spriteRepo.getByProjectId(projectId);
    }
    async createConfig(projectId: string, config: Omit<SpriteConfig, "projectId" | "updatedAt">): Promise<SpriteConfig> {
        return this.spriteRepo.create(projectId, config);
    }
    async updateConfig(projectId: string, patch: Partial<SpriteConfig>): Promise<SpriteConfig> {
        return this.spriteRepo.update(projectId, patch);
    }
    async removeConfig(projectId: string): Promise<void> {
        return this.spriteRepo.remove(projectId);
    }
}