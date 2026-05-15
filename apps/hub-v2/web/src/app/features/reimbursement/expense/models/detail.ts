import { ExpenseCollect } from './expense.model';

export const ExpenseMockDetailData: ExpenseCollect = {
  header: {
    code: 'BX-202604-018',
    status: '待部门主管审批',
    title: '差旅费报销',
    scene: '深圳客户现场支持',
    submitTime: '2026-04-30 16:51',
    amount: 3860,
    currentNode: '部门主管',
    waitTime: '6h',
  },

  basicInfo: {
    department: '产品部',
    expensePerson: '张三',
    reportDate: '2026-05-11',
    receiptCount: 5,
    remark: '采购办公用品及行政耗材',
  },

  expenseItems: [
    {
      id: '1',
      purpose: '采购打印纸',
      amount: 560,
    },
    {
      id: '2',
      purpose: '采购办公文具',
      amount: 300,
    },
    {
      id: '3',
      purpose: '会议室绿植维护',
      amount: 2000,
    },
  ],

  summary: {
    totalAmount: 2860,
    advanceAmount: 1000,
    differenceAmount: -1860,

    attachments: [
      {
        id: '1',
        name: '发票.pdf',
        url: '/mock/invoice.pdf',
        size: 1024 * 500,
        type: 'application/pdf',
        uploadTime: new Date('2026-05-11 10:30:00'),
      },
      {
        id: '2',
        name: '采购清单.xlsx',
        url: '/mock/list.xlsx',
        size: 1024 * 300,
        type: 'application/vnd.ms-excel',
        uploadTime: new Date('2026-05-11 11:00:00'),
      },
    ],
  },
};
