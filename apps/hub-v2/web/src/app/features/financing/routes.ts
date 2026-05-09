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
    path: 'addTravelExpense',
    loadComponent: () =>
      import('../travel-expense/pages/add-travel-expense/add-travel-expense').then((m) => m.AddTravelExpense),
  },
  {
    path: 'addExpense',
    loadComponent: () =>
      import('../expense/pages/add-expense/add-expense').then((m) => m.AddExpense),
  },
];
