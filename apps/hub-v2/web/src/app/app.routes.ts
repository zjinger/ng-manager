import { Routes } from '@angular/router';
import { adminGuard } from './core/auth/admin.guard';
import { authGuard } from './core/auth/auth.guard';
import { FEATURE_FLAGS } from './core/feature-flags';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/pages/login-page/login-page.component').then(
        (m) => m.LoginPageComponent,
      ),
  },
  {
    path: 'public/docs/:projectKey/:slug',
    loadComponent: () =>
      import('./features/content/pages/public-document-page/public-document-page.component').then(
        (m) => m.PublicDocumentPageComponent,
      ),
  },
  {
    path: 'public/docs/:slug',
    loadComponent: () =>
      import('./features/content/pages/public-document-legacy-page/public-document-legacy-page.component').then(
        (m) => m.PublicDocumentLegacyPageComponent,
      ),
  },
  // {
  //   path: 'public/survey',
  //   loadComponent: () =>
  //     import('./features/feedback/pages/public-survey-page/public-survey-page.component').then(
  //       (m) => m.PublicSurveyPageComponent
  //     ),
  // },
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
  // {
  //   path: 'public/report',
  //   loadChildren: () =>
  //     import('./features/public-report/routes').then((m) => m.PUBLIC_REPORT_ROUTES),
  // },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
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
      // {
      //   path: 'report',
      //   pathMatch: 'full',
      //   redirectTo: 'reports',
      // },
      // {
      //   path: 'reports',
      //   loadChildren: () => import('./features/report/routes').then((m) => m.REPORT_ROUTES),
      // },
      {
        path: 'issues',
        loadChildren: () => import('./features/issues/routes').then((m) => m.ISSUE_ROUTES),
      },
      {
        path: 'rd',
        loadChildren: () => import('./features/rd/routes').then((m) => m.RD_ROUTES),
      },
      {
        path: 'content',
        loadChildren: () => import('./features/content/routes').then((m) => m.CONTENT_ROUTES),
      },
      {
        path: 'projects',
        loadChildren: () => import('./features/projects/routes').then((m) => m.PROJECT_ROUTES),
      },

      ...(FEATURE_FLAGS.feedback
        ? [
            {
              path: 'feedbacks',
              loadChildren: () =>
                import('./features/feedback/routes').then((m) => m.FEEDBACK_ROUTES),
            },
          ]
        : []),

      ...(FEATURE_FLAGS.survey
        ? [
            {
              path: 'surveys',
              loadChildren: () => import('./features/survey/routes').then((m) => m.SURVEY_ROUTES),
            },
          ]
        : []),
        // ========
        {
          path: 're-dashboard',
          loadChildren: () =>
            import('./features/reimbursement/dashboard/routes').then((m) => m.RE_DASHBOARD_ROUTES),
        },
        {
          path: 'travel-expense',
          loadChildren: () =>
            import('./features/reimbursement/travel-expense/routes').then((m) => m.TRAVEL_EXPENSE_ROUTES),
        },
        {
          path: 'expense',
          loadChildren: () =>
            import('./features/reimbursement/expense/routes').then((m) => m.EXPENSE_ROUTES),
        },
        {
          path: 'my-expenses',
          loadChildren: () =>
            import('./features/reimbursement/my-expenses/routes').then((m) => m.MY_EXPENSES_ROUTES),
        },
        {
          path: 'approval-pending',
          loadChildren: () =>
            import('./features/reimbursement/approval-pending/routes').then((m) => m.APPROVAL_PENDING_ROUTES),
        },
        {
          path: 'history-expense',
          loadChildren: () =>
            import('./features/reimbursement/history-expense/routes').then((m) => m.HISTORY_EXPENSE_ROUTES),
        },
        {
          path: 'expense-notice',
          loadChildren: () =>
            import('./features/reimbursement/expense-notice/routes').then((m) => m.EXPENSE_NOTICE_ROUTES),
        },
        //=========
      {
        path: 'profile',
        loadChildren: () => import('./features/profile/routes').then((m) => m.PROFILE_ROUTES),
      },
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
