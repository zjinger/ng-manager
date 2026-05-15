import { ApprovalListItem, SelectOption } from '.';

export const MockApprovalList: ApprovalListItem[] = [
  {
    id: 'AP202605130001',

    code: 'BX-20260513-0001',

    applicant: '张三',

    department: 'tech',

    expenseType: 'travel',

    title: '上海客户现场项目实施差旅报销',

    amount: 12860.5,

    approvalNode: 'finance',

    waitDuration: '2天4小时',
  },

  {
    id: 'AP202605130002',

    code: 'BX-20260513-0002',

    applicant: '李四',

    department: 'product',

    expenseType: 'expense',

    title: '办公用品采购报销',

    amount: 860,

    approvalNode: 'leader',

    waitDuration: '5小时',
  },

  {
    id: 'AP202605130003',

    code: 'BX-20260513-0003',

    applicant: '王五',

    department: 'tech',

    expenseType: 'travel',

    title: '深圳客户拜访差旅费',

    amount: 5320,

    approvalNode: 'gm',

    waitDuration: '4天2小时',
  },

  {
    id: 'AP202605130004',

    code: 'BX-20260513-0004',

    applicant: '赵六',

    department: 'product',

    expenseType: 'expense',

    title: '团队聚餐费用报销',

    amount: 2300,

    approvalNode: 'finance',

    waitDuration: '1天3小时',
  },

  {
    id: 'AP202605130005',

    code: 'BX-20260513-0005',

    applicant: '陈伟',

    department: 'tech',

    expenseType: 'travel',

    title: '广州项目驻场差旅报销',

    amount: 19800,

    approvalNode: 'leader',

    waitDuration: '6天',
  },
];
// 列表筛选选项
export const ExpenseTypeOptions: SelectOption[] = [
  {
    label: '差旅费报销',
    value: 'travel',
  },
  {
    label: '费用报销',
    value: 'expense',
  },
];
export const ApprovalNodeOptions: SelectOption[] = [
  {
    label: '部门负责人',
    value: 'leader',
  },

  {
    label: '财务审核',
    value: 'finance',
  },

  {
    label: '总经理',
    value: 'gm',
  },
];
export const DepartmentOptions: SelectOption[] = [
  {
    label: '技术部',
    value: 'tech',
  },

  {
    label: '产品部',
    value: 'product',
  },
];