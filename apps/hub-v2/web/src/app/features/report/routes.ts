import { Routes } from '@angular/router';

export const REPORT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/report-home/report-home.component').then((m) => m.ReportHomePageComponent),
  },
];

