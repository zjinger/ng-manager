import { Routes } from '@angular/router';

export const FINANCING_ROUTES: Routes = [
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/financing-dashboard-page/financing-dashboard-page.component').then(
        (m) => m.FinancingDashboardPageComponent
      ),
  },
];
