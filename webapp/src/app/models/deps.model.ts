import type { DepGroup as DepGroupDto, DepItemDto, ProjectDepsResultDto } from "@yinuo-ngm/protocol";

export type DepGroup = DepGroupDto;
export type DepItem = DepItemDto & {
    homepage?: string;
    description?: string;
};
export type DepsResp = ProjectDepsResultDto;
