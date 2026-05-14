export interface SelectOption {
  label: string;
  value: string;
}

export interface HistoryExpenseItem {
  id: string;

  // 单据编号
  code: string;

  // 申请人
  applicant: string;

  // 部门
  department: string;

  // 类型
  expenseType: string;

  // 事由
  title: string;

  // 金额
  amount: number;

  // 我参与的节点
  roleNode: string;

  // 我的动作
  actionType: string;

  // 处理时间
  handledTime: string;

  // 当前状态
  status: string;

  // 当前节点
  currentNode: string;
}
/**
 * 历史报销单筛选条件
 */
export interface HistoryExpenseFilterQuery {
  page: number;

  pageSize: number;

  // 角色节点
  roleNodes: string[];

  // 处理动作
  actionTypes: string[];

  // 当前状态
  statuses: string[];

  // 部门
  departments: string[];

  // 日期
  date: Date | null;

  // 搜索关键词
  keyword: string;
}
