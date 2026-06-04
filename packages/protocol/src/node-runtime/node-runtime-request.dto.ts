import type { NodeRuntimeConfigDto } from "./node-runtime.dto";

export interface ResolveNodeRuntimeRequestDto {
    runtime?: NodeRuntimeConfigDto;
}

export interface TestNodeRuntimeRequestDto {
    runtime?: NodeRuntimeConfigDto;
}

export interface UpdateProjectRuntimeRequestDto {
    runtime?: NodeRuntimeConfigDto;
}
