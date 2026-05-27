import { Routes } from '@angular/router';

import { ProjectFeatureProgressPageComponent } from './pages/project-feature-progress-page/project-feature-progress-page.component';
import { ProjectListPageComponent } from './pages/project-list-page/project-list-page.component';

export const PROJECT_ROUTES: Routes = [
  { path: 'progress', component: ProjectFeatureProgressPageComponent },
  { path: '', component: ProjectListPageComponent },
];
