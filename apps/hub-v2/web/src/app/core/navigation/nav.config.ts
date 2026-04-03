import type { NavSection } from './menu.types';

export const NAV_ITEMS: NavSection[] = [
  {
    key: 'workspace',
    label: '工作台',
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: 'dashboard', route: '/dashboard', exact: true },
      { key: 'dashboard-board', label: '数据看板', icon: 'line-chart', route: '/dashboard/board' },
      { key: 'reports', label: '积木报表', icon: 'robot', route: '/reports' },
    ],
  },
  {
    key: 'collaboration',
    label: '协作中心',
    items: [
      { key: 'issues', label: '测试跟踪', icon: 'bug', route: '/issues', tone: 'danger' },
      { key: 'rd', label: '研发管理', icon: 'rocket', route: '/rd', tone: 'warning' },
    ],
  },
  {
    key: 'content-center',
    label: '内容中心',
    items: [
      { key: 'content', label: '内容管理', icon: 'read', route: '/content' },
    ],
  },
  {
    key: 'feedback-center',
    label: '反馈中心',
    items: [
      { key: 'feedbacks', label: '系统反馈', icon: 'message', route: '/feedbacks' },
      { key: 'surveys', label: '问卷调查', icon: 'form', route: '/surveys' },
    ],
  },
  {
    key: 'management',
    label: '系统管理',
    items: [
      { key: 'projects', label: '项目管理', icon: 'appstore', route: '/projects' },
      { key: 'users', label: '用户管理', icon: 'team', route: '/users' },
      // { key: 'shared-config', label: '共享配置', icon: 'setting', route: '/shared-config' },
    ],
  },
];
