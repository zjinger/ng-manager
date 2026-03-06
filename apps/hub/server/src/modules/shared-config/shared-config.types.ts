export type SharedConfigValueType = "string" | "json" | "number" | "boolean";
export type SharedConfigScope = "public" | "admin";

export interface SharedConfigEntity {
  id: string;
  configKey: string;
  configValue: string;
  valueType: SharedConfigValueType;
  scope: SharedConfigScope;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SharedConfigViewItem {
  id: string;
  configKey: string;
  value: string | number | boolean | Record<string, unknown> | unknown[] | null;
  rawValue: string;
  valueType: SharedConfigValueType;
  scope: SharedConfigScope;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSharedConfigInput {
  configKey: string;
  configValue: string;
  valueType: SharedConfigValueType;
  scope: SharedConfigScope;
  description?: string;
}

export interface UpdateSharedConfigInput {
  configValue?: string;
  valueType?: SharedConfigValueType;
  scope?: SharedConfigScope;
  description?: string | null;
}

export interface ListSharedConfigQuery {
  scope?: SharedConfigScope;
  keyword?: string;
  page: number;
  pageSize: number;
}

export interface SharedConfigListResult {
  items: SharedConfigViewItem[];
  page: number;
  pageSize: number;
  total: number;
}