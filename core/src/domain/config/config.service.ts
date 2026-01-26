// core/src/domain/config/config.service.ts
import type { ConfigPatch } from "./patch/patch.model";
import type { ConfigSchema, ConfigViewModel, ConfigViewModelQuery } from "./providers";
import { type ConfigFileType, ConfigTreeNode, ConfigCatalogDocV1 } from "./catalog";
import { WorkspaceModel } from "./workspace";
import { ConfigFileReadResult, ResolvedDomain } from "./config.types";
import { DomainSchemaDoc } from "./schema/schema.domain.dto";



export interface ConfigService {
    getTree(projectId: string): Promise<ConfigTreeNode[]>;

    /**  一次返回 tree + schemas */
    getCatalogDoc(projectId: string): Promise<ConfigCatalogDocV1>;

    getSchema(projectId: string, type?: ConfigFileType): Promise<ConfigSchema>;

    getWorkspace(projectId: string, opts?: { type?: ConfigFileType; relPath?: string }): Promise<Pick<WorkspaceModel, "filePath" | "raw">>;

    getViewModel( projectId: string, opts?: { type?: ConfigFileType } & ConfigViewModelQuery ): Promise<ConfigViewModel>;

    diff( projectId: string, patch: ConfigPatch, opts?: { type?: ConfigFileType } ): Promise<{ patch: ConfigPatch; diffText: string; nextRawPreview: ConfigViewModel }>;

    apply( projectId: string, patch: ConfigPatch, opts?: { type?: ConfigFileType; force?: boolean } ): Promise<{ saved: true; forced: boolean; filePath: string; diffText: string }>;

    /**
     * 获取指定项目的配置目录解析结果
     * @param projectId 项目 ID
     * @returns 解析后的配置域数组
     */
    getCatalog(projectId: string): Promise<ResolvedDomain[]>;

    /** 
     * 读取指定配置文件
     * @param projectId 项目 ID
     * @param docId 配置文件 ID
     * @returns 读取结果
     */
    readDoc(projectId: string, docId: string): Promise<ConfigFileReadResult>;

    /**
     * 写入指定配置文件
     * @param projectId 项目 ID
     * @param docId 配置文件 ID
     * @param next 写入内容
     * @returns void
     */
    writeDoc(projectId: string, docId: string, next: unknown): Promise<void>;

    /**打开文件（用于“打开配置文件”按钮） */
    openDoc(projectId: string, docId: string): Promise<{ root: string; filePath: string }>;

    /**
     * 获取指定域的域级配置文档
     * @param projectId 项目 ID
     * @param domainId 域 ID
     * @returns 域级配置文档
     */
    getDomainSchemaDoc(projectId: string, domainId: string): Promise<DomainSchemaDoc>;

    /**
     * 读取指定域的域级配置结构化数据
     * @param projectId 项目 ID
     * @param domainId 域 ID
     * @returns 结构化数据
     */
    readDomainSchema(projectId: string, domainId: string): Promise<any>;

    /**
     * 写入指定域的域级配置结构化数据
     * @param projectId 项目 ID
     * @param domainId 域 ID
     * @param next 结构化数据
     * @returns void
     */
    writeDomainSchema( projectId: string, domainId: string, nextVM: any ): Promise<void>;
}
