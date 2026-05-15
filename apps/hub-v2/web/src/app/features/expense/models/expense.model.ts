import { ExpenseSummary, ProcessHeaderInfo } from '@app/features/travel-expense/models';

// 基础信息类型
export type ExpenseBasicInfo = {
  department: string; // 报销部门
  expensePerson: string; // 报销人
  reportDate: string; // 填报日期
  receiptCount: number | null; // 单据数量
  remark: string; // 备注
};
// 费用明细类型
export interface ExpenseDetailItem {
  id: string;
  purpose: string; // 用途
  amount: number | null; // 金额
}
export interface ExpenseCollect {
  // 顶部信息
  header: ProcessHeaderInfo;
  basicInfo: ExpenseBasicInfo;
  expenseItems: ExpenseDetailItem[];
  summary: ExpenseSummary;
}
