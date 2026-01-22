// core/src/domain/config/config.service.ts
import type { ConfigPatch } from "./patch/patch.model";
import type { ConfigSchema, ConfigViewModel, ConfigViewModelQuery } from "./providers";
import { type ConfigFileType, ConfigTreeNode, ConfigCatalogDocV1 } from "./catalog";
import { WorkspaceModel } from "./workspace";



export interface ConfigService {
    getTree(projectId: string): Promise<ConfigTreeNode[]>;

    /**  一次返回 tree + schemas */
    getCatalogDoc(projectId: string): Promise<ConfigCatalogDocV1>;

    getSchema(projectId: string, type?: ConfigFileType): Promise<ConfigSchema>;

    getWorkspace(projectId: string, opts?: { type?: ConfigFileType; relPath?: string }): Promise<Pick<WorkspaceModel, "filePath" | "raw">>;

    getViewModel(
        projectId: string,
        opts?: { type?: ConfigFileType } & ConfigViewModelQuery
    ): Promise<ConfigViewModel>;

    diff(
        projectId: string,
        patch: ConfigPatch,
        opts?: { type?: ConfigFileType }
    ): Promise<{ patch: ConfigPatch; diffText: string; nextRawPreview: ConfigViewModel }>;

    apply(
        projectId: string,
        patch: ConfigPatch,
        opts?: { type?: ConfigFileType; force?: boolean }
    ): Promise<{ saved: true; forced: boolean; filePath: string; diffText: string }>;
}
