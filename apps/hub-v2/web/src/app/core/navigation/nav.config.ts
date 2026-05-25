import type { NavSection } from './menu.types';
import { ANNOUNCEMENT_GLOBAL_MANAGE_PERMISSION, PROJECT_GOVERNANCE_PERMISSIONS } from '../auth/permission.constants';

export const NAV_ITEMS: NavSection[] = [
  {
    key: 'workspace',
    label: '工作台',
    items: [
      { key: 'dashboard', label: '工作台', icon: 'dashboard', route: '/dashboard', exact: true },
      {
        key: 'dashboard-board',
        label: '数据看板',
        icon: 'line-chart',
        route: '/dashboard/board',
        permissions: [...PROJECT_GOVERNANCE_PERMISSIONS],
      },
      // { key: 'reports', label: '积木报表', icon: 'robot', route: '/reports' },
    ],
  },
  {
    key: 'collaboration',
    label: '协作中心',
    items: [
      {
        key: 'issues',
        label: '测试跟踪',
        icon: 'bug',
        route: '/issues',
        tone: 'danger',
        permissions: [...PROJECT_GOVERNANCE_PERMISSIONS],
      },
      {
        key: 'rd',
        label: '研发管理',
        icon: 'rocket',
        route: '/rd',
        tone: 'warning',
        permissions: [...PROJECT_GOVERNANCE_PERMISSIONS],
      },
    ],
  },
  {
    key: 'content-center',
    label: '内容中心',
    items: [
      {
        key: 'content',
        label: '内容管理',
        icon: 'read',
        route: '/content',
        permissions: [...PROJECT_GOVERNANCE_PERMISSIONS],
      },
      {
        key: 'global-announcements',
        label: '全局公告',
        icon: 'notification',
        route: '/content/global-announcements',
        exact: true,
        permissions: [ANNOUNCEMENT_GLOBAL_MANAGE_PERMISSION],
      },
    ],
  },
  // {
  //   key: 'feedback-center',
  //   label: '反馈中心',
  //   items: [
  //     { key: 'feedbacks', label: '系统反馈', icon: 'message', route: '/feedbacks' },
  //     ...(FEATURE_FLAGS.survey
  //       ? [{ key: 'surveys', label: '问卷调查', icon: 'form', route: '/surveys' }]
  //       : []),
  //   ],
  // },
  {
    key: 'financing-center',
    label: '财务中心',
    items: [
      {
        key: 'reimbursements',
        label: '报销管理',
        icon: 'profile',
        route: '/reimbursements',
        exact: true,
        permissions: ['expense.review.manage', 'finance.review', 'finance.cashier'],
        permissionMode: 'any',
      },
      {
        key: 'reimbursements-mine',
        label: '我的报销',
        icon: 'account-book',
        route: '/reimbursements/mine',
        exact: true,
        badge: 'Beta',
        tone: 'info',
        permissions: ['expense.view.self'],
      },
      {
        key: 'reimbursement-announcements',
        label: '公告管理',
        icon: 'notification',
        route: '/reimbursements/announcements',
        exact: true,
        permissions: ['expense.rule.manage'],
      },
    ],
  },
  {
    key: 'management',
    label: '系统管理',
    items: [
      {
        key: 'projects',
        label: '项目管理',
        icon: 'appstore',
        route: '/projects',
        permissions: [...PROJECT_GOVERNANCE_PERMISSIONS],
      },
      {
        key: 'users',
        label: '用户管理',
        icon: 'team',
        route: '/users',
      },
      // { key: 'shared-config', label: '共享配置', icon: 'setting', route: '/shared-config' },
    ],
  },
];
