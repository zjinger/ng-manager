import { SpriteConfig, SpriteSnapshot, GenerateSpriteOptions } from "./sprite.types";

export interface SpriteService {
    getConfig(projectId: string): Promise<SpriteConfig | null>;
    createConfig(projectId: string, config: Omit<SpriteConfig, "projectId" | "updatedAt">): Promise<SpriteConfig>;
    updateConfig(projectId: string, patch: Partial<SpriteConfig>): Promise<SpriteConfig>;
    removeConfig(projectId: string): Promise<void>;
    generate(projectId: string, options: GenerateSpriteOptions): Promise<SpriteSnapshot>;
    getSprites(projectId: string, local?: boolean): Promise<SpriteSnapshot>;
    ensureCacheDir(projectId: string): string;
}
