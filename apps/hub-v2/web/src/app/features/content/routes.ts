import { Routes } from '@angular/router';

import { ContentManagementPageComponent } from './pages/content-management-page/content-management-page.component';
import { ContentDetailPageComponent } from './pages/content-detail-page/content-detail-page.component';

export const CONTENT_ROUTES: Routes = [
  { path: ':tab/:contentId', component: ContentDetailPageComponent },
  { path: '', component: ContentManagementPageComponent },
];
