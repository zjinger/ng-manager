export type FeedbackSource = "desktop" | "cli" | "web" | "mobile" | "applet";
export type FeedbackCategory = "bug" | "suggestion" | "feature" | "other";
export type FeedbackStatus = "open" | "processing" | "resolved" | "closed";

export interface FeedbackEntity {
  id: string;  // 反馈 ID
  projectKey?: string | null; // 反馈所属的项目，null 表示未关联项目
  source: FeedbackSource; // 用户反馈的来源，例如桌面应用、命令行工具、网页、移动端或小程序
  category: FeedbackCategory; // 用户反馈的类别，例如 bug、suggestion、feature 或其他
  title: string; // 用户反馈的标题
  content: string; // 用户反馈的内容
  contact?: string | null; // 例如邮箱或其他联系方式
  clientName?: string | null; // 例如应用名称
  clientVersion?: string | null; // 例如应用版本
  osInfo?: string | null; // 例如操作系统信息
  clientIp?: string | null; // 例如用户提交反馈时的 IP 地址
  status: FeedbackStatus; // 反馈的处理状态，例如 open、processing、resolved 或 closed
  createdAt: string;
  updatedAt: string;
}

export interface CreateFeedbackInput {
  projectKey?: string | null;
  source: FeedbackSource;
  category: FeedbackCategory;
  title: string;
  content: string;
  contact?: string;
  clientName?: string;
  clientVersion?: string;
  osInfo?: string;
  clientIp?: string;
}

export interface UpdateFeedbackStatusInput {
  status: FeedbackStatus;
}

export interface ListFeedbackQuery {
  projectKey?: string;
  status?: FeedbackStatus;
  category?: FeedbackCategory;
  keyword?: string;
  page: number;
  pageSize: number;
}

export interface FeedbackListResult {
  items: FeedbackEntity[];
  page: number;
  pageSize: number;
  total: number;
}
