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
          import('./management/pages/reimbursement-management-page/reimbursement-management-page').then(
            (m) => m.ReimbursementManagementPage
          ),
      },
      {
        path: 'mine',
        canActivate: [permissionGuard],
        data: { permissions: ['expense.view.self'] },
        loadComponent: () =>
          import('./mine/pages/expenses-list-page/expenses-list-page').then((m) => m.ExpensesListPage),
      },
      {
        path: 'new/travel',
        loadComponent: () =>
          import('./form/pages/add-travel-expense/add-travel-expense').then((m) => m.AddTravelExpense),
      },
      {
        path: 'new/general',
        loadComponent: () =>
          import('./form/pages/add-expense/add-expense').then((m) => m.AddExpense),
      },
      {
        path: 'announcements',
        canActivate: [permissionGuard],
        data: { permissions: ['expense.rule.manage'] },
        loadComponent: () =>
          import('./announcements/pages/reimbursement-announcement-page/reimbursement-announcement-page').then(
            (m) => m.ReimbursementAnnouncementPage
          ),
      },
      {
        path: ':claimId/edit',
        loadComponent: () =>
          import('./form/pages/reimbursement-edit-page/reimbursement-edit-page').then(
            (m) => m.ReimbursementEditPage
          ),
      },
      {
        path: ':claimId',
        loadComponent: () =>
          import('./detail/pages/reimbursement-detail/reimbursement-detail').then(
            (m) => m.ReimbursementDetailPage
          ),
      },
    ],
  },
];
