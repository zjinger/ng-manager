import { SpriteConfig } from "./sprite.types";

export interface SpriteRepo {
    getByProjectId(projectId: string): Promise<SpriteConfig | null>;
    create(projectId: string, config: Omit<SpriteConfig, "projectId" | "updatedAt">): Promise<SpriteConfig>;
    update(projectId: string, patch: Partial<SpriteConfig>): Promise<SpriteConfig>;
    remove(projectId: string): Promise<void>;
}