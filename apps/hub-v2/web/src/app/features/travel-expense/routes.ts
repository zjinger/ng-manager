import { Routes } from '@angular/router';

export const TRAVEL_EXPENSE_ROUTES: Routes = [
  {
    path: 'new',
    loadComponent: () =>
      import('./pages/add-travel-expense/add-travel-expense').then((m) => m.AddTravelExpense),
  },
  {
    path: 'detail/:id',
    loadComponent: () =>
      import('./pages/travel-expense-detail/travel-expense-detail').then((m) => m.TravelExpenseDetail),
  },
  {
    path: 'edit/:id',
    loadComponent: () =>
      import('./pages/add-travel-expense/add-travel-expense').then((m) => m.AddTravelExpense),
  },
];
