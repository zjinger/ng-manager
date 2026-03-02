import { GenerateSpriteOptions, SpriteConfig, SpriteSnapshot } from "./sprite.types";

export interface SpriteService {
    getConfig(projectId: string): Promise<SpriteConfig | null>;
    createConfig(projectId: string, config: Omit<SpriteConfig, "projectId" | "updatedAt">): Promise<SpriteConfig>;
    updateConfig(projectId: string, patch: Partial<SpriteConfig>): Promise<SpriteConfig>;
    removeConfig(projectId: string): Promise<void>;
    generate(projectId: string, options: GenerateSpriteOptions): Promise<SpriteSnapshot>;
    /** 读取 cacheOutDir 下的各 group meta.json，组装成 UI 需要的结构 */
    getSprites(projectId: string): Promise<SpriteSnapshot>;

}