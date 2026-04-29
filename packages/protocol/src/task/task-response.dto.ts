import type { LogLine } from "../ws.log.types";
import type { TaskRowDto, TaskRuntimeDto } from "./task-runtime.dto";

export type TaskListResponseDto = TaskRowDto[];
export type TaskRefreshResponseDto = TaskRowDto[];
export type TaskRuntimeResponseDto = TaskRuntimeDto;
export type TaskActiveResponseDto = TaskRuntimeDto[];
export type TaskRunLogResponseDto = LogLine[];
