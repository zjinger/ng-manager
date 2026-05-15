import { HistoryExpenseItem, SelectOption } from './history-expense.model';

export const DepartmentOptions: SelectOption[] = [
  {
    label: '技术部',
    value: 'tech',
  },

  {
    label: '产品部',
    value: 'product',
  },

  {
    label: '财务部',
    value: 'finance',
  },

  {
    label: '行政部',
    value: 'admin',
  },
];
export const StatusOptions: SelectOption[] = [
  {
    label: '审批中',
    value: 'processing',
  },

  {
    label: '已完成',
    value: 'completed',
  },

  {
    label: '已驳回',
    value: 'rejected',
  },

  {
    label: '已撤销',
    value: 'cancelled',
  },
];

export const ActionTypeOptions: SelectOption[] = [
  {
    label: '通过',
    value: 'approve',
  },

  {
    label: '驳回',
    value: 'reject',
  },

  {
    label: '退回修改',
    value: 'return',
  },
];
export const RoleNodeOptions: SelectOption[] = [
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

  {
    label: '出纳',
    value: 'cashier',
  },
];

export const MockHistoryExpenseList: HistoryExpenseItem[] = [
  {
    id: 'HX001',

    code: 'BX-20260513-0001',

    applicant: '张三',

    department: 'tech',

    expenseType: 'travel',

    title: '上海客户现场实施差旅报销',

    amount: 12860.5,

    roleNode: 'finance',

    actionType: 'approve',

    handledTime: '2026-05-13 14:20',

    status: 'processing',

    currentNode: 'gm',
  },

  {
    id: 'HX002',

    code: 'BX-20260512-0002',

    applicant: '李四',

    department: 'product',

    expenseType: 'expense',

    title: '办公用品采购报销',

    amount: 980,

    roleNode: 'leader',

    actionType: 'reject',

    handledTime: '2026-05-12 09:10',

    status: 'rejected',

    currentNode: 'end',
  },

  {
    id: 'HX003',

    code: 'BX-20260510-0003',

    applicant: '王五',

    department: 'tech',

    expenseType: 'travel',

    title: '深圳项目驻场住宿报销',

    amount: 5680,

    roleNode: 'gm',

    actionType: 'approve',

    handledTime: '2026-05-10 18:30',

    status: 'approved',

    currentNode: 'finish',
  },
];
