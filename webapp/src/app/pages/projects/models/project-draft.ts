import { DetectResult, PackageManager } from "@models/project.model";

// src/app/projects/models/project-draft.ts
export type ProjectMode = 'create' | 'import';

export interface CreateProjectDraft {
    mode: ProjectMode;

    name: string;
    parentDir: string;  // create 模式：父目录
    rootPath: string;   // 最终路径：parentDir + name（import 模式直接等于选择路径）
    packageManager: PackageManager;

    overwriteIfExists: boolean;
    skipOnboarding: boolean;

    initGit: boolean;
    initialCommitMessage?: string;
    
    detected?: DetectResult

    importScriptsAsTasks: boolean;
    importMakefileTasks: boolean;
    importDockerComposeTasks: boolean;
    generateCommonTasks: boolean;

    featureTasks: boolean;
    featureProcesses: boolean;
    featureLogs: boolean;
    featureTerminal: boolean;

    pinFavorite: boolean;
    openAfterCreate: 'tasks' | 'home';
    defaultTaskName?: string;
}

export function createEmptyDraft(): CreateProjectDraft {
    return {
        mode: 'create',
        name: '',
        parentDir: '',
        rootPath: '',
        packageManager: 'auto',
        overwriteIfExists: false,
        skipOnboarding: false,
        initGit: true,
        initialCommitMessage: '',
        importScriptsAsTasks: true,
        importMakefileTasks: false,
        importDockerComposeTasks: false,
        generateCommonTasks: true,
        featureTasks: true,
        featureProcesses: true,
        featureLogs: true,
        featureTerminal: false,
        pinFavorite: false,
        openAfterCreate: 'tasks',
        defaultTaskName: '',
    };
}
