import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/pages/login-page/login-page.component').then(
        (m) => m.LoginPageComponent
      ),
  },
  {
    path: 'public/docs/:slug',
    loadComponent: () =>
      import('./features/content/pages/public-document-page/public-document-page.component').then(
        (m) => m.PublicDocumentPageComponent
      ),
  },
  // {
  //   path: 'public/survey',
  //   loadComponent: () =>
  //     import('./features/feedback/pages/public-survey-page/public-survey-page.component').then(
  //       (m) => m.PublicSurveyPageComponent
  //     ),
  // },
  {
    path: 'public/surveys/:slug',
    loadComponent: () =>
      import('./features/survey/pages/public-survey-form-page/public-survey-form-page.component').then(
        (m) => m.PublicSurveyFormPageComponent
      ),
  },
  {
    path: 'public/report',
    loadChildren: () =>
      import('./features/public-report/routes').then((m) => m.PUBLIC_REPORT_ROUTES),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./core/layout/app-shell/app-shell.component').then(
        (m) => m.AppShellComponent
      ),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./features/dashboard/routes').then((m) => m.DASHBOARD_ROUTES),
      },
      {
        path: 'report',
        pathMatch: 'full',
        redirectTo: 'reports',
      },
      {
        path: 'reports',
        loadChildren: () =>
          import('./features/report/routes').then((m) => m.REPORT_ROUTES),
      },
      {
        path: 'issues',
        loadChildren: () =>
          import('./features/issues/routes').then((m) => m.ISSUE_ROUTES),
      },
      {
        path: 'rd',
        loadChildren: () =>
          import('./features/rd/routes').then((m) => m.RD_ROUTES),
      },
      {
        path: 'content',
        loadChildren: () =>
          import('./features/content/routes').then((m) => m.CONTENT_ROUTES),
      },
      {
        path: 'feedbacks',
        loadChildren: () =>
          import('./features/feedback/routes').then((m) => m.FEEDBACK_ROUTES),
      },
      {
        path: 'surveys',
        loadChildren: () =>
          import('./features/survey/routes').then((m) => m.SURVEY_ROUTES),
      },
      {
        path: 'projects',
        loadChildren: () =>
          import('./features/projects/routes').then((m) => m.PROJECT_ROUTES),
      },
      {
        path: 'users',
        loadChildren: () =>
          import('./features/users/routes').then((m) => m.USER_ROUTES),
      },
      {
        path: 'shared-config',
        loadChildren: () =>
          import('./features/shared-config/routes').then(
            (m) => m.SHARED_CONFIG_ROUTES
          ),
      },
      {
        path: 'profile',
        loadChildren: () =>
          import('./features/profile/routes').then((m) => m.PROFILE_ROUTES),
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
