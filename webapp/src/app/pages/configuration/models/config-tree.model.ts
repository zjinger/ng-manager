import { ProjectFramework } from "@models/index";
import { ConfigSchema } from "./config.model";

export type ConfigFileType = "angular" | "tsconfig" | "eslint" | "prettier";

export interface ConfigCatalogDocV1 {
    projectId: string;
    framework?: ProjectFramework;
    tree: ConfigTreeNode[];
    schemas?: Record<ConfigFileType, ConfigSchema>; // 该节点对应的配置文件的 schema
    version: 1;
}

export interface ConfigTreeNode {
    id: string;              // 唯一 id：angular/angular.json
    label: string;           // 展示名：angular.json
    description?: string;    // 描述（可选）
    icon?: string;

    // 如果是“文件节点”，就带 file 信息
    file?: {
        type: ConfigFileType;  // 由哪个 provider 处理
        relPath: string;       // 相对 projectRoot 的文件路径（如 angular.json）
    };
    // 点击这个节点后，默认打开哪个 section（可选）
    defaultSectionId?: string;
    children?: ConfigTreeNode[];
}
