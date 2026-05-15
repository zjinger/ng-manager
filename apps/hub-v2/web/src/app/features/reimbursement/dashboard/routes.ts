import { Routes } from '@angular/router';

export const RE_DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/re-dashboard-page/re-dashboard-page.component').then(
        (m) => m.ReDashboardPageComponent
      ),
  },
  {
    path: 'my-todos',
    loadComponent: () =>
      import('./pages/my-todos-page/my-todos-page.component').then(
        (m) => m.MyTodosPageComponent
      ),
  },
];
