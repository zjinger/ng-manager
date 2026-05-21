import { Routes } from '@angular/router';
import { permissionGuard } from '@core/auth';

export const REIMBURSEMENT_ROUTES: Routes = [
  {
    path: 'reimbursements',
    children: [
      {
        path: '',
        pathMatch: 'full',
        canActivate: [permissionGuard],
        data: {
          permissions: ['expense.review.manage', 'finance.review', 'finance.cashier'],
          permissionMode: 'any',
        },
        loadComponent: () =>
          import('./management/reimbursement-management-page/reimbursement-management-page').then(
            (m) => m.ReimbursementManagementPage
          ),
      },
      {
        path: 'mine',
        canActivate: [permissionGuard],
        data: { permissions: ['expense.view.self'] },
        loadComponent: () =>
          import('./mine/expenses-list-page/expenses-list-page').then((m) => m.ExpensesListPage),
      },
      {
        path: 'new/travel',
        loadComponent: () =>
          import('./form/add-travel-expense/add-travel-expense').then((m) => m.AddTravelExpense),
      },
      {
        path: 'new/general',
        loadComponent: () =>
          import('./form/add-expense/add-expense').then((m) => m.AddExpense),
      },
      {
        path: 'announcements',
        canActivate: [permissionGuard],
        data: { permissions: ['expense.rule.manage'] },
        loadComponent: () =>
          import('./announcements/reimbursement-announcement-page/reimbursement-announcement-page').then(
            (m) => m.ReimbursementAnnouncementPage
          ),
      },
      {
        path: ':claimId/edit',
        loadComponent: () =>
          import('./form/reimbursement-edit-page/reimbursement-edit-page').then(
            (m) => m.ReimbursementEditPage
          ),
      },
      {
        path: ':claimId',
        loadComponent: () =>
          import('./detail/reimbursement-detail/reimbursement-detail').then(
            (m) => m.ReimbursementDetailPage
          ),
      },
    ],
  },
];
