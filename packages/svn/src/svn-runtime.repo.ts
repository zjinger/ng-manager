import type { SvnRuntime } from "./svn.types";

export interface SvnRuntimeRepo {
    get(projectId: string, sourceId: string): SvnRuntime | undefined;
    update(projectId: string, sourceId: string, patch: Partial<SvnRuntime>): SvnRuntime;
}
