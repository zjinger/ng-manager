import { Routes } from '@angular/router';

export const PUBLIC_REPORT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/public-report-page/public-report-page.component').then((m) => m.PublicReportPageComponent),
  },
];

