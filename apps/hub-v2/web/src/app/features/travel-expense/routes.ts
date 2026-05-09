import { Routes } from '@angular/router';

export const TRAVEL_EXPENSE_ROUTES: Routes = [
  {
    path: 'addTravelExpense',
    loadComponent: () =>
      import('./pages/add-travel-expense/add-travel-expense').then((m) => m.AddTravelExpense),
  },
];
