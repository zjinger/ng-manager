import { Routes } from '@angular/router';
import { permissionGuard, PROJECT_GOVERNANCE_PERMISSIONS } from '@core/auth';

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
    canActivate: [permissionGuard],
    data: { permissions: [...PROJECT_GOVERNANCE_PERMISSIONS] },
    loadComponent: () =>
      import('./pages/dashboard-board-page/dashboard-board-page.component').then(
        (m) => m.DashboardBoardPageComponent
      ),
  },
  {
    path: 'todos',
    canActivate: [permissionGuard],
    data: { permissions: [...PROJECT_GOVERNANCE_PERMISSIONS] },
    loadComponent: () =>
      import('./pages/dashboard-todos-page/dashboard-todos-page.component').then(
        (m) => m.DashboardTodosPageComponent
      ),
  },
  {
    path: 'reported-issues',
    canActivate: [permissionGuard],
    data: { permissions: [...PROJECT_GOVERNANCE_PERMISSIONS] },
    loadComponent: () =>
      import('./pages/dashboard-reported-issues-page/dashboard-reported-issues-page.component').then(
        (m) => m.DashboardReportedIssuesPageComponent
      ),
  },
];
