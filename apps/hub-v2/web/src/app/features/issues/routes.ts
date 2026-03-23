import { Routes } from '@angular/router';

export const ISSUE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/issue-list-page/issue-list-page.component').then((m) => m.IssueListPageComponent),
  },
  {
    path: ':issueId',
    loadComponent: () =>
      import('./pages/issue-detail-page/issue-detail-page.component').then(
        (m) => m.IssueDetailPageComponent
      ),
  },
];
