import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layout/admin-shell.component').then((m) => m.AdminShellComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./pages/admin-dashboard-page.component').then((m) => m.AdminDashboardPageComponent),
      },
      {
        path: 'users',
        loadChildren: () => import('../users/routes').then((m) => m.USER_ROUTES),
      },
      {
        path: 'departments',
        loadChildren: () => import('../organization/routes').then((m) => m.ORGANIZATION_ROUTES),
      },
      {
        path: 'projects',
        loadChildren: () => import('../projects/routes').then((m) => m.PROJECT_ROUTES),
      },
      {
        path: 'roles',
        data: { title: '角色管理', icon: 'safety-certificate' },
        loadComponent: () =>
          import('./pages/roles-page/roles-page.component').then((m) => m.RolesPageComponent),
      },
      {
        path: 'permissions',
        data: { title: '权限配置', icon: 'key' },
        loadComponent: () =>
          import('./pages/permissions-page.component').then((m) => m.PermissionsPageComponent),
      },
      {
        path: 'audit',
        data: { title: '审计日志', icon: 'audit' },
        loadComponent: () =>
          import('./pages/admin-placeholder-page.component').then((m) => m.AdminPlaceholderPageComponent),
      },
      {
        path: 'groups',
        data: { title: '用户组', icon: 'team' },
        loadComponent: () =>
          import('./pages/admin-placeholder-page.component').then((m) => m.AdminPlaceholderPageComponent),
      },
      {
        path: 'settings',
        data: { title: '系统设置', icon: 'setting' },
        loadComponent: () =>
          import('./pages/admin-placeholder-page.component').then((m) => m.AdminPlaceholderPageComponent),
      },
    ],
  },
];
