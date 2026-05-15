import { Routes } from '@angular/router';
export const APPROVAL_PENDING_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/approval-pending/approval-pending').then((m) => m.ApprovalPending),
  },
];
