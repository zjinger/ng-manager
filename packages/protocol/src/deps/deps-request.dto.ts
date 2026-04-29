export type DepGroup = "dependencies" | "devDependencies";

export type DepTarget = "required" | "latest" | "custom";

export interface InstallDepRequestDto {
    name: string;
    group: DepGroup;
    target: DepTarget;
    version?: string;
}

export interface UninstallDepRequestDto {
    name: string;
    group: DepGroup;
}