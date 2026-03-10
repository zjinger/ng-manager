export type SharedConfigScope = "global" | "project";
export type SharedConfigStatus = "active" | "disabled";
export type SharedConfigValueType = "json" | "text" | "number" | "boolean";

export interface SharedConfigEntity {
  id: string;
  projectId: string | null; // 如果 scope 是 "project"，则 projectId 不为 null；如果 scope 是 "global"，则 projectId 为 null
  scope: SharedConfigScope; // 定义配置的作用范围，global 表示全局配置，project 表示项目级配置
  configKey: string; // 配置的唯一标识符，在同一作用范围内必须唯一
  configName: string; // 配置的显示名称，供用户界面使用
  category: string; // 配置的分类，用于组织和过滤配置项
  valueType: SharedConfigValueType; // 配置值的类型，决定了 configValue 的格式和解析方式
  configValue: string; // 配置的实际值，存储为字符串，根据 valueType 进行解析
  description: string; // 配置的描述信息，提供给用户界面显示
  isEncrypted: boolean; // 标识配置值是否加密存储，如果为 true，则 configValue 存储的是加密后的字符串
  priority: number; // 配置的优先级，用于在多个配置项冲突时决定使用哪个配置，数值越大优先级越高
  status: SharedConfigStatus; // 配置的状态，active 表示配置生效，disabled 表示配置被禁用
  createdAt: string; 
  updatedAt: string;
}

export interface CreateSharedConfigInput {
  projectId?: string | null;
  scope?: SharedConfigScope;
  configKey: string;
  configName: string;
  category: string;
  valueType?: SharedConfigValueType;
  configValue: string;
  description?: string;
  isEncrypted?: boolean;
  priority?: number;
  status?: SharedConfigStatus;
}

export interface UpdateSharedConfigInput {
  configName?: string;
  category?: string;
  valueType?: SharedConfigValueType;
  configValue?: string;
  description?: string;
  isEncrypted?: boolean;
  priority?: number;
  status?: SharedConfigStatus;
}

export interface ListSharedConfigQuery {
  projectId?: string;
  scope?: SharedConfigScope;
  category?: string;
  keyword?: string;
  status?: SharedConfigStatus;
  page?: number;
  pageSize?: number;
}

export interface ResolveSharedConfigQuery {
  projectId?: string; // 可选，如果提供则优先返回项目级配置，否则返回全局配置
  category?: string; // 可选，指定要解析的配置分类，如果不提供则解析所有分类的配置
}

export interface SharedConfigListResult {
  list: SharedConfigEntity[];
  total: number;
  page: number;
  pageSize: number;
}