import type {
    CheckRootResultDto,
    DetectResultDto,
    ImportCheckResultDto,
    ProjectDto,
} from "./project.dto";

export type ProjectListResponseDto = ProjectDto[];
export type ProjectDetailResponseDto = ProjectDto;
export type ProjectMutationResponseDto = ProjectDto;
export type ProjectCheckRootResponseDto = CheckRootResultDto;
export type ProjectDetectResponseDto = DetectResultDto;
export type ProjectImportCheckResponseDto = ImportCheckResultDto;

export interface ProjectIdResponseDto {
    id: string;
}
