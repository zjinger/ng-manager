// core/src/domain/config/config.service.ts
import { ConfigFileReadResult, ResolvedDomain } from "./config.types";
import { DomainSchemaDiffResult } from "./schema";
import { DomainSchemaDoc } from "./schema/schema.domain.dto";



export interface ConfigService {
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
    writeDomainSchema(projectId: string, domainId: string, nextVM: any): Promise<void>;

    /**
     * 对比指定域的域级配置结构化数据差异
     * @param projectId 项目 ID
     * @param domainId 域 ID
     * @param currentVM 当前结构化数据
     * @returns 差异结果
     */
    diffDomainSchema(projectId: string, domainId: string, currentVM: any): Promise<DomainSchemaDiffResult>;
}
