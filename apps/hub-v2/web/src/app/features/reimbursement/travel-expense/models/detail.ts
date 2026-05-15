import { ProcessOperationRecord } from '../components/record-list/record-list.component';
import { TravelExpenseDetailData } from './travel.model';

export const MockDetailData: TravelExpenseDetailData = {
  // 顶部卡片
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

  // 基础信息
  basicInfo: {
    department: '技术部',
    name: '张三',
    position: '高级工程师',

    reportDate: '2026-04-30',

    travelReason: '前往深圳客户现场进行技术支持，解决系统部署',

    startDate: '2026-04-28',
    startTime: 'am',

    endDate: '2026-04-30',
    endTime: 'pm',

    travelDays: 3,

    receiptCount: 12,
  },

  // 行程费用明细
  expenseItems: [
    {
      id: '1',

      date: new Date('2026-04-28'),

      startEndLocation: ['深圳', '北京'],

      days: 1,

      airfare: 0,

      transportation: 538,

      localTransport: 45,

      accommodation: 458,

      mealAllowance: 60,

      other: 0,

      subtotal: 1101,
    },

    {
      id: '2',

      date: new Date('2026-04-29'),

      startEndLocation: ['深圳', '天津、青岛'],

      days: 1,

      airfare: 0,

      transportation: 0,

      localTransport: 30,

      accommodation: 458,

      mealAllowance: 60,

      other: 25,

      subtotal: 573,
    },

    {
      id: '3',

      date: new Date('2026-04-30'),

      startEndLocation: ['深圳', '上海'],

      days: 1,

      airfare: 0,

      transportation: 538,

      localTransport: 35,

      accommodation: 458,

      mealAllowance: 60,

      other: 0,

      subtotal: 1091,
    },
  ],

  // 汇总
  summary: {
    totalAmount: 2765,

    advanceAmount: 2000,

    differenceAmount: 765,

    attachments: [
      {
        id: '1',
        name: '高铁行程单.pdf',
        url: '/mock/gaotie.pdf',
        size: 1024 * 500,
        type: 'pdf',
        uploadTime: new Date(),
      },

      {
        id: '2',
        name: '住宿发票.jpg',
        url: '/mock/hotel.jpg',
        size: 1024 * 300,
        type: 'image',
        uploadTime: new Date(),
      },
    ],
  },
};

export const MockRecordListData: ProcessOperationRecord[] = [
  {
    id: '1',
    time: '04-30 16:51',
    operator: '张涛',
    action: '提交',
    remark: '提交差旅费报销',
  },
  {
    id: '2',
    time: '04-30 17:20',
    operator: '周亦航',
    action: '通过',
    remark: '信息无误',
  },
  {
    id: '3',
    time: '05-01 09:10',
    operator: '部门主管',
    action: '待处理',
    remark: '当前节点',
  },
];
