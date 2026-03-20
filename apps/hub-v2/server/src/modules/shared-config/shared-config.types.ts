import type { PageResult } from "../../shared/http/pagination";

export type SharedConfigScope = "global" | "project";
export type SharedConfigStatus = "active" | "inactive";

export interface SharedConfigEntity {
  id: string;
  projectId: string | null;
  scope: SharedConfigScope;
  configKey: string;
  configName: string;
  category: string;
  valueType: string;
  configValue: string;
  description: string | null;
  isEncrypted: boolean;
  priority: number;
  status: SharedConfigStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSharedConfigInput {
  projectId?: string | null;
  scope?: SharedConfigScope;
  configKey: string;
  configName: string;
  category?: string;
  valueType?: string;
  configValue: string;
  description?: string;
  isEncrypted?: boolean;
  priority?: number;
}

export interface UpdateSharedConfigInput {
  projectId?: string | null;
  scope?: SharedConfigScope;
  configName?: string;
  category?: string;
  valueType?: string;
  configValue?: string;
  description?: string | null;
  isEncrypted?: boolean;
  priority?: number;
  status?: SharedConfigStatus;
}

export interface ListSharedConfigsQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: SharedConfigStatus;
  scope?: SharedConfigScope;
  projectId?: string;
  category?: string;
}

export interface PublicSharedConfigsQuery {
  projectId?: string;
  category?: string;
}

export type SharedConfigListResult = PageResult<SharedConfigEntity>;
