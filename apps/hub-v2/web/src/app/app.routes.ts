import { Routes } from '@angular/router';
import { adminGuard } from './core/auth/admin.guard';
import { authGuard } from './core/auth/auth.guard';
import { ANNOUNCEMENT_GLOBAL_MANAGE_PERMISSION, permissionGuard, PROJECT_GOVERNANCE_PERMISSIONS, TASK_SHEET_PERMISSIONS } from './core/auth';
import { FEATURE_FLAGS } from './core/feature-flags';

export const routes: Routes = [
  // 登录页面路由
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/pages/login-page/login-page.component').then(
        (m) => m.LoginPageComponent,
      ),
  },
  // 公开文档页面路由
  {
    path: 'public/docs/:projectKey/:slug',
    loadComponent: () =>
      import('./features/content/pages/public-document-page/public-document-page.component').then(
        (m) => m.PublicDocumentPageComponent,
      ),
  },
  // 公开文档旧页面路由，兼容之前分享的链接
  {
    path: 'public/docs/:slug',
    loadComponent: () =>
      import('./features/content/pages/public-document-legacy-page/public-document-legacy-page.component').then(
        (m) => m.PublicDocumentLegacyPageComponent,
      ),
  },
  // 公开公告页面路由
  {
    path: 'public/announcements/:announcementId',
    loadComponent: () =>
      import('./features/content/pages/public-announcement-page/public-announcement-page.component').then(
        (m) => m.PublicAnnouncementPageComponent,
      ),
  },
  // 问卷调查公开页面路由
  ...(FEATURE_FLAGS.survey
    ? [
        {
          path: 'public/surveys/:slug',
          loadComponent: () =>
            import('./features/survey/pages/public-survey-form-page/public-survey-form-page.component').then(
              (m) => m.PublicSurveyFormPageComponent,
            ),
        },
      ]
    : []),
  // 积木报表对外公开页面路由
  // {
  //   path: 'public/report',
  //   loadChildren: () =>
  //     import('./features/public-report/routes').then((m) => m.PUBLIC_REPORT_ROUTES),
  // },
  // 管理员页面路由
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
  // 其他页面路由，需登录后访问
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./core/layout/app-shell/app-shell.component').then((m) => m.AppShellComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        loadChildren: () => import('./features/dashboard/routes').then((m) => m.DASHBOARD_ROUTES),
      },
      // 积木报表路由
      // {
      //   path: 'reports',
      //   loadChildren: () => import('./features/report/routes').then((m) => m.REPORT_ROUTES),
      // },
      // 测试跟踪
      {
        path: 'issues',
        canActivate: [permissionGuard],
        data: { permissions: [...PROJECT_GOVERNANCE_PERMISSIONS] },
        loadChildren: () => import('./features/issues/routes').then((m) => m.ISSUE_ROUTES),
      },
      // 研发路由
      {
        path: 'rd',
        canActivate: [permissionGuard],
        data: { permissions: [...PROJECT_GOVERNANCE_PERMISSIONS, ...TASK_SHEET_PERMISSIONS] },
        loadChildren: () => import('./features/rd/routes').then((m) => m.RD_ROUTES),
      },
      // 项目实施总览
      {
        path: 'delivery-overview',
        canActivate: [permissionGuard],
        data: { permissions: [...PROJECT_GOVERNANCE_PERMISSIONS] },
        loadChildren: () =>
          import('./features/delivery-overview/routes').then((m) => m.DELIVERY_OVERVIEW_ROUTES),
      },
      // 内容路由：公告、文档、版本发布等
      {
        path: 'content',
        canActivate: [permissionGuard],
        data: { permissions: [...PROJECT_GOVERNANCE_PERMISSIONS, ANNOUNCEMENT_GLOBAL_MANAGE_PERMISSION] },
        loadChildren: () => import('./features/content/routes').then((m) => m.CONTENT_ROUTES),
      },
      // 项目路由
      {
        path: 'projects',
        canActivate: [permissionGuard],
        data: { permissions: [...PROJECT_GOVERNANCE_PERMISSIONS] },
        loadChildren: () => import('./features/projects/routes').then((m) => m.PROJECT_ROUTES),
      },
      // 用户通讯录只读入口已收口到 Admin Console；如后续需要重新开放协作侧通讯录，可恢复以下路由。
      // {
      //   path: 'users',
      //   data: { readonly: true },
      //   loadChildren: () => import('./features/users/routes').then((m) => m.USER_ROUTES),
      // },
      // 系统反馈路由
      ...(FEATURE_FLAGS.feedback
        ? [
            {
              path: 'feedbacks',
              loadChildren: () =>
                import('./features/feedback/routes').then((m) => m.FEEDBACK_ROUTES),
            },
          ]
        : []),
      // 问卷调查路由
      ...(FEATURE_FLAGS.survey
        ? [
            {
              path: 'surveys',
              loadChildren: () => import('./features/survey/routes').then((m) => m.SURVEY_ROUTES),
            },
          ]
        : []),
      // 报销路由
      {
        path: '',
        loadChildren: () =>
          import('./features/reimbursement/routes').then((m) => m.REIMBURSEMENT_ROUTES),
      },
      // 个人中心
      {
        path: 'profile',
        loadChildren: () => import('./features/profile/routes').then((m) => m.PROFILE_ROUTES),
      },
      // 通知路由
      {
        path: 'notifications',
        loadChildren: () =>
          import('./features/notifications/routes').then((m) => m.NOTIFICATION_ROUTES),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
