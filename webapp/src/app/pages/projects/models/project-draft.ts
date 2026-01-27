import { DetectResult, PackageManager } from "@models/project.model";

export type ProjectPreset = "angular" | "vue3" | "manual" | "git";

export interface CreateProjectDraft {
    preset: ProjectPreset;

    name: string;
    parentDir: string;  // create 模式：父目录
    rootPath: string;   // 最终路径：parentDir + name
    packageManager: PackageManager;
    repoUrl?: string; // Git 仓库地址

    overwriteIfExists: boolean; // 覆盖已存在目录
    
    skipOnboarding: boolean; // 跳过新手引导

    initGit: boolean;
    initialCommitMessage?: string;

    detected?: DetectResult

    importScriptsAsTasks: boolean;
    importMakefileTasks: boolean;
    importDockerComposeTasks: boolean;
    generateCommonTasks: boolean;

    pinFavorite: boolean;
    defaultTaskName?: string;
    // cli 相关
    cliFramework?: "angular" | "vue";
    cliTool?: "@angular/cli" | "@vue/cli" | "create-vue" | "custom";
    cliArgs?: string[];          // 可选扩展
}

export function createEmptyDraft(): CreateProjectDraft {
    return {
        preset: "angular", // 默认预设
        name: '',
        parentDir: '',
        rootPath: '',
        packageManager: 'auto',
        overwriteIfExists: false,
        skipOnboarding: true,
        initGit: true,
        initialCommitMessage: '',
        importScriptsAsTasks: true,
        importMakefileTasks: false,
        importDockerComposeTasks: false,
        generateCommonTasks: true,
        pinFavorite: false,
        defaultTaskName: '',

        cliFramework: "angular",
        cliTool: "@angular/cli",
        cliArgs: [],
    };
}
