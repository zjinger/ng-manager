import { Routes } from '@angular/router';

import { ProjectFeatureProgressPageComponent } from './pages/project-feature-progress-page/project-feature-progress-page.component';
import { ProjectListPageComponent } from './pages/project-list-page/project-list-page.component';
import { MobileAppVersionPageComponent } from './pages/mobile-app-version-page/mobile-app-version-page.component';

export const PROJECT_ROUTES: Routes = [
  { path: 'progress', component: ProjectFeatureProgressPageComponent },
  { path: 'mobile-app-versions', component: MobileAppVersionPageComponent },
  { path: '', component: ProjectListPageComponent },
];
