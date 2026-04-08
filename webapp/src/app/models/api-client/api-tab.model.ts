/**
 * API Client Tab 模型定义
 * 支持多请求并行编辑
 */

import type { ApiRequestEntity } from './api-request.model';
import type { SendResponse } from './api-send.model';

/**
 * Tab 实体
 */
export interface ApiClientTab {
  /** Tab 唯一 ID */
  id: string;
  /** 关联的请求 ID（未保存时为 null） */
  requestId: string | null;
  /** 请求实体（独立副本） */
  request: ApiRequestEntity;
  /** 保存时的请求快照（用于比较是否有修改） */
  savedSnapshot?: ApiRequestEntity | null;
  /** Tab 标题（可自定义） */
  title: string;
  /** 是否有未保存修改 */
  isDirty: boolean;
  /** 最后一次响应 */
  lastResponse: SendResponse | null;
  /** 创建时间 */
  createdAt: number;
  /** 更新时间 */
  updatedAt: number;
}

/**
 * Tab 状态
 */
export interface ApiClientTabState {
  tabs: ApiClientTab[];
  activeTabId: string | null;
  maxTabs: number;
}

/**
 * Tab 重命名事件
 */
export interface TabRenameEvent {
  id: string;
  title: string;
}

/**
 * Tab 重排序事件
 */
export interface TabReorderEvent {
  from: number;
  to: number;
}
