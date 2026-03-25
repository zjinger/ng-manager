import { Routes } from '@angular/router';

export const FEEDBACK_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/feedback-page/feedback-page.component').then((m) => m.FeedbackPageComponent),
  },
];
