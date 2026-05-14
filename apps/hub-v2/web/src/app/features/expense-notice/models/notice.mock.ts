import { signal } from '@angular/core';
import { NoticeDetail, SelectOption } from './notice.model';

export const NoticeTypeOptions: SelectOption[] = [
  {
    label: '系统公告',
    value: 'system',
  },

  {
    label: '财务通知',
    value: 'finance',
  },

  {
    label: '制度通知',
    value: 'policy',
  },

  {
    label: '活动公告',
    value: 'activity',
  },
];
export const StatusOptions: SelectOption[] = [
  {
    label: '草稿',
    value: 'draft',
  },

  {
    label: '已发布',
    value: 'published',
  },

  {
    label: '已下线',
    value: 'offline',
  },
];
export const VisibleScopeOptions: SelectOption[] = [
  {
    label: '全部人员',
    value: 'all',
  },

  {
    label: '财务部门',
    value: 'finance',
  },

  {
    label: '管理层',
    value: 'manager',
  },
];

export const DisplayData: NoticeDetail[] = [
  {
    id: '1',

    title: '五一期间差旅报销说明',

    type: 'finance',

    visibleScope: 'all',

    publishStatus: 'published',

    effectiveDate: '2026-05-01',

    expireDate: '2026-05-10',

    content: '五一期间请及时提交差旅报销。',

    pinned: true,

    notifyRelatedUsers: true,

    publisher: '财务部',

    updatedAt: '2026-05-14 10:30:00',
  },

  {
    id: '2',

    title: '新版费用制度上线通知',

    type: 'policy',

    visibleScope: 'manager',

    publishStatus: 'draft',

    effectiveDate: '',

    expireDate: '',

    content: '新版费用制度已上线，请及时查看。',

    pinned: false,

    notifyRelatedUsers: false,

    publisher: '行政部',

    updatedAt: '2026-05-13 16:00:00',
  },
]
