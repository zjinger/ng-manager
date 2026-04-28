import type { BootstrapCtx } from "./bootstrap.types";

export interface ProjectBootstrapService {
    bootstrapByCli(input: {
        parentDir: string;
        name: string;
        packageManager?: "auto" | "npm" | "pnpm" | "yarn";
        overwriteIfExists?: boolean;
        skipOnboarding?: boolean;
        cliFramework?: "angular" | "vue";
    }): Promise<{ ok: boolean; taskId: string; rootPath: string }>;

    bootstrapByGit(input: {
        repoUrl: string;
        parentDir: string;
        name: string;
        overwriteIfExists?: boolean;
        branch?: string;
        depth?: number;
    }): Promise<{ ok: boolean; taskId: string; rootPath: string }>;

    pickWorkspaceRoot(input: {
        taskId: string;
        pickedRoot: string;
    }): Promise<{ projectId: string; rootPath: string }>;
}