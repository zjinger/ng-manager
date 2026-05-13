import { Routes } from '@angular/router';

export const ORGANIZATION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/organization-page/organization-page.component').then((m) => m.OrganizationPageComponent),
  },
];
