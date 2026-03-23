import type { PageResult } from '../../../core/types/page.types';

export type SharedConfigScope = 'global' | 'project';
export type SharedConfigStatus = 'active' | 'inactive' | '';

export interface SharedConfigEntity {
  id: string;
  projectId: string | null;
  scope: Exclude<SharedConfigScope, ''>;
  configKey: string;
  configName: string;
  category: string;
  valueType: string;
  configValue: string;
  description: string | null;
  isEncrypted: boolean;
  priority: number;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface SharedConfigListQuery {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: SharedConfigStatus;
  scope?: SharedConfigScope | '';
  projectId?: string;
  category?: string;
}

export interface CreateSharedConfigInput {
  projectId?: string | null;
  scope?: Exclude<SharedConfigScope, ''>;
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
  scope?: Exclude<SharedConfigScope, ''>;
  configName?: string;
  category?: string;
  valueType?: string;
  configValue?: string;
  description?: string | null;
  isEncrypted?: boolean;
  priority?: number;
  status?: Exclude<SharedConfigStatus, ''>;
}

export type SharedConfigListResult = PageResult<SharedConfigEntity>;
