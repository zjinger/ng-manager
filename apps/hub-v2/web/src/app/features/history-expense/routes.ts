import { Routes } from '@angular/router';
export const HISTORY_EXPENSE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/history-expense-page/history-expense-page').then(
        (m) => m.HistoryExpensePageComponent
      ),
  },
];
