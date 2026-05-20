import { Routes } from '@angular/router';
import { permissionGuard } from '@core/auth';

export const REIMBURSEMENT_ROUTES: Routes = [
  {
    path: 'expense-notice',
    canActivate: [permissionGuard],
    data: { permissions: ['expense.rule.manage'] },
    loadChildren: () =>
      import('./announcements/routes').then((m) => m.REIMBURSEMENT_ANNOUNCEMENT_ROUTES),
  },
  // {
  //   path: 're-dashboard',
  //   pathMatch: 'prefix',
  //   redirectTo: '/dashboard',
  // },
  {
    path: 'travel-expense',
    loadChildren: () => import('./travel-expense/routes').then((m) => m.TRAVEL_EXPENSE_ROUTES),
  },
  {
    path: 'expense',
    loadChildren: () => import('./expense/routes').then((m) => m.EXPENSE_ROUTES),
  },
  {
    path: 'my-expenses',
    data: { permissions: ['expense.view.self'] },
    loadChildren: () => import('./my-expenses/routes').then((m) => m.MY_EXPENSES_ROUTES),
  },
  // {
  //   path: 'approval-pending',
  //   loadChildren: () =>
  //     import('./approval-pending/routes').then((m) => m.APPROVAL_PENDING_ROUTES),
  // },
  // {
  //   path: 'history-expense',
  //   loadChildren: () =>
  //     import('./history-expense/routes').then((m) => m.HISTORY_EXPENSE_ROUTES),
  // },
];
