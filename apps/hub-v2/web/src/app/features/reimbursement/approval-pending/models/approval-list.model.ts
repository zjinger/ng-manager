export interface ApprovalListItem {
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
  // 当前审批节点
  approvalNode: string;
  // 等待时长
  waitDuration: string;
}

export interface SelectOption {
  label: string;
  value: string;
}