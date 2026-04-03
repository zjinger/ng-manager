import { Routes } from '@angular/router';

export const SURVEY_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/survey-list-page/survey-list-page.component').then((m) => m.SurveyListPageComponent),
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./pages/survey-editor-page/survey-editor-page.component').then((m) => m.SurveyEditorPageComponent),
  },
  {
    path: ':surveyId/submissions',
    loadComponent: () =>
      import('./pages/survey-submissions-page/survey-submissions-page.component').then(
        (m) => m.SurveySubmissionsPageComponent
      ),
  },
  {
    path: ':surveyId',
    loadComponent: () =>
      import('./pages/survey-editor-page/survey-editor-page.component').then((m) => m.SurveyEditorPageComponent),
  },
];
