import { Routes } from '@angular/router';

export const FINANCING_ROUTES: Routes = [
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/financing-dashboard-page/financing-dashboard-page.component').then(
        (m) => m.FinancingDashboardPageComponent
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
