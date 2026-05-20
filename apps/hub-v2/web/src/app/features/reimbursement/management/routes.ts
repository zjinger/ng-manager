import { Routes } from '@angular/router';

export const REIMBURSEMENT_MANAGEMENT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/reimbursement-management-page/reimbursement-management-page').then(
        (m) => m.ReimbursementManagementPage
      ),
  },
];
