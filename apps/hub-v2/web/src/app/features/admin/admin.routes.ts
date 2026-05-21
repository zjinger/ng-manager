import { Routes } from '@angular/router';
import { permissionGuard } from '@core/auth';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layout/admin-shell.component').then((m) => m.AdminShellComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        canActivate: [permissionGuard],
        data: { permissions: ['admin.dashboard.view'] },
        loadComponent: () =>
          import('./pages/admin-dashboard-page.component').then((m) => m.AdminDashboardPageComponent),
      },
      {
        path: 'users',
        canActivate: [permissionGuard],
        data: { permissions: ['admin.users.manage'] },
        loadChildren: () => import('../users/routes').then((m) => m.USER_ROUTES),
      },
      {
        path: 'departments',
        canActivate: [permissionGuard],
        data: { permissions: ['admin.departments.manage'] },
        loadChildren: () => import('../organization/routes').then((m) => m.ORGANIZATION_ROUTES),
      },
      {
        path: 'titles',
        canActivate: [permissionGuard],
        data: { title: '职务管理', icon: 'idcard', permissions: ['admin.users.manage'] },
        loadComponent: () =>
          import('./pages/titles-page/titles-page.component').then((m) => m.TitlesPageComponent),
      },
      {
        path: 'roles',
        canActivate: [permissionGuard],
        data: { title: '角色管理', icon: 'safety-certificate', permissions: ['admin.roles.manage'] },
        loadComponent: () =>
          import('./pages/roles-page/roles-page.component').then((m) => m.RolesPageComponent),
      },
      {
        path: 'permissions',
        canActivate: [permissionGuard],
        data: { title: '权限配置', icon: 'key', permissions: ['admin.roles.manage'] },
        loadComponent: () =>
          import('./pages/permissions-page.component').then((m) => m.PermissionsPageComponent),
      },
      {
        path: 'permission-items',
        canActivate: [permissionGuard],
        data: { title: '权限项管理', icon: 'unordered-list', permissions: ['admin.roles.manage'] },
        loadComponent: () =>
          import('./pages/permission-items-page/permission-items-page.component').then((m) => m.PermissionItemsPageComponent),
      },
      {
        path: 'audit',
        canActivate: [permissionGuard],
        data: { title: '审计日志', icon: 'audit', permissions: ['admin.audit.view'] },
        loadComponent: () =>
          import('./pages/audit-log-page/audit-log-page.component').then((m) => m.AuditLogPageComponent),
      },
      // {
      //   path: 'groups',
      //   data: { title: '用户组', icon: 'team' },
      //   loadComponent: () =>
      //     import('./pages/admin-placeholder-page.component').then((m) => m.AdminPlaceholderPageComponent),
      // },
      {
        path: 'settings',
        canActivate: [permissionGuard],
        data: { title: '系统设置', icon: 'setting', permissions: ['admin.settings.manage'] },
        loadComponent: () =>
          import('./pages/settings-page/settings-page.component').then((m) => m.SettingsPageComponent),
      },
    ],
  },
];
