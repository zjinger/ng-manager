import { Routes } from '@angular/router';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/dashboard-page/dashboard-page.component').then(
        (m) => m.DashboardPageComponent
      ),
  },
  {
    path: 'board',
    loadComponent: () =>
      import('./pages/dashboard-board-page/dashboard-board-page.component').then(
        (m) => m.DashboardBoardPageComponent
      ),
  },
  {
    path: 'todos',
    loadComponent: () =>
      import('./pages/dashboard-todos-page/dashboard-todos-page.component').then(
        (m) => m.DashboardTodosPageComponent
      ),
  },
  {
    path: 'reported-issues',
    loadComponent: () =>
      import('./pages/dashboard-reported-issues-page/dashboard-reported-issues-page.component').then(
        (m) => m.DashboardReportedIssuesPageComponent
      ),
  },
];
