import { Routes } from '@angular/router';

export const USER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/user-list-page/user-list-page.component').then((m) => m.UserListPageComponent),
  },
];
