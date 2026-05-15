// 单条行程明细类型
export interface TravelExpenseItem {
  id: string;
  date: Date | null; // 日期
  startEndLocation: string[]; // 起讫地点
  days: number | null; // 天数
  airfare: number | null; // 机票
  transportation: number | null; // 机票
  localTransport: number | null; // 市内交通
  accommodation: number | null; // 住宿
  mealAllowance: number | null; // 餐补
  other: number | null; // 其他
  subtotal: number; // 小计
}
// 附件类型
export interface ExpenseAttachment {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  uploadTime: Date;
}
// 汇总数据类型
export type ExpenseSummary = {
  totalAmount: number; // 总计金额（自动计算，不可编辑）
  advanceAmount: number; // 预支金额（用户输入）
  differenceAmount: number; // 应退/应补（自动计算）
  attachments: ExpenseAttachment[]; // 附件列表
};
// 基础信息类型
export type TravelExpenseBasicInfo = {
  department: string; // 报销部门
  name: string; // 姓名
  position: string; // 职别
  reportDate: string; // 填报日期
  travelReason: string; // 出差事由
  startDate: string; // 出差开始日期
  startTime: 'am' | 'pm' | ''; // 开始时间（上/下午）
  endDate: string; // 出差结束日期
  endTime: 'am' | 'pm' | ''; // 结束时间（上/下午）
  travelDays: number | null; // 出差天数（支持手动输入）
  receiptCount: number | null; // 单据张数
};
// 顶部流程卡片
// =========================

export interface ProcessHeaderInfo {
  code?: string;
  status?: string;
  title?: string;
  scene?: string;
  submitTime?: string;
  amount?: number;
  currentNode?: string;
  waitTime?: string;
}

// =========================
// 详情页完整数据
// =========================

export interface TravelExpenseDetailData {
  // 顶部信息
  header: ProcessHeaderInfo;

  // 基础信息
  basicInfo: TravelExpenseBasicInfo;

  // 费用明细
  expenseItems: TravelExpenseItem[];

  // 汇总
  summary: ExpenseSummary;
}
/**
 * 格式化选项值
 * @param value 选项值
 * @param options 选项列表
 * @returns 格式化后的选项值
 */
export const normalizeOption = (
  value?: string | null,
  options?: { value: string; label: string }[]
): string => {
  if (!value || !options) {
    return '';
  }
  // 已经是 value
  const matchedValue = options.find((item) => item.value === value);
  if (matchedValue) {
    return matchedValue.value;
  }
  // 传的是 label
  const matchedLabel = options.find((item) => item.label === value);
  if (matchedLabel) {
    return matchedLabel.value;
  }
  return '';
};

/**
 * 格式化行程
 * @returns 格式化后的行程
 */
export const formatTravelRoute = (routes: string[]): string => {
  if (!Array.isArray(routes) || routes.length === 0) {
    return '-';
  }
  const [start = '', end = ''] = routes;
  return `${start} - ${end}`;
};

/**
 * 格式化日期
 * @param value 日期值
 * @returns 格式化后的日期
 */
export const formatDate = (value: Date): string => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};
/**
 * 解析日期
 * @param value 日期值
 * @returns 解析后的日期
 * string -> Date
 */
export const parseDate = (value?: string | null): Date | null => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}