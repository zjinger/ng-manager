import type { ProjectAssetsDto } from "./project.dto";

export interface CheckProjectRootRequestDto {
    rootPath: string;
}

export interface DetectProjectRequestDto {
    rootPath: string;
}

export interface CreateProjectRequestDto {
    name: string;
    root: string;
    syncTasks?: boolean;
}

export interface ImportProjectRequestDto {
    root: string;
    name?: string;
    syncTasks?: boolean;
}

export interface UpdateProjectRequestDto {
    name?: string;
    env?: Record<string, string>;
    scripts?: Record<string, string>;
}

export interface SetProjectFavoriteRequestDto {
    isFavorite: boolean;
}

export interface SetProjectLastOpenedRequestDto {
    timestamp: number;
}

export interface RenameProjectRequestDto {
    name: string;
}

export interface EditProjectRequestDto {
    name: string;
    description?: string;
    repoPageUrl?: string;
}

export interface UpdateProjectAssetsRequestDto {
    assets: ProjectAssetsDto;
}

export interface OpenProjectInEditorRequestDto {
    editor?: "code" | "system";
}
