export type DepGroup = "dependencies" | "devDependencies";

export interface DepItemDto {
    name: string;
    current?: string;
    required?: string;
    latest?: string;
    installed: boolean;
    hasUpdate: boolean;
    group: DepGroup;
}

export interface ProjectDepsMetaDto {
    packageManager: "npm";
    registryOnline: boolean;
    voltaConfig?: string;
    enginesNode?: string;
}

export interface ProjectDepsResultDto {
    dependencies: DepItemDto[];
    devDependencies: DepItemDto[];
    meta: ProjectDepsMetaDto;
}

export interface OkResponseDto {
    ok: true;
}