export interface NoticeFormValue {
  title: string;

  type: string;

  visibleScope: string;

  publishStatus: string;

  effectiveDate: string;

  expireDate: string;

  content: string;

  pinned: boolean;

  notifyRelatedUsers: boolean;
}

/**
 * 列表项
 */
export interface NoticeListItem {
  id: string;

  title: string;

  type: string;

  visibleScope: string;

  status: 'draft' | 'published' | 'offline';

  pinned: boolean;

  publisher: string;

  updatedAt: string;
}

/**
 * 公告详情
 */
export interface NoticeDetail extends NoticeFormValue {
  id: string;

  publisher: string;

  updatedAt: string;
}

export interface SelectOption {
  label: string;

  value: string;
}
/**
 * 公共公告筛选条件
 */
export interface NoticeFilterQuery {
  page: number;

  pageSize: number;

  // 公告类型
  noticeTypes: string[];

  // 公告状态
  noticeStatuses: string[];

  // 可见范围
  visibleScopes: string[];

  // 日期
  date: Date | null;

  // 搜索关键词
  keyword: string;
}
