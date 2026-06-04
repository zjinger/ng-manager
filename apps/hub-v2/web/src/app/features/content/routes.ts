import { Routes } from '@angular/router';
import { ANNOUNCEMENT_GLOBAL_MANAGE_PERMISSION, permissionGuard, PROJECT_GOVERNANCE_PERMISSIONS, SKILL_HUB_PERMISSIONS } from '@core/auth';

import { ContentManagementPageComponent } from './pages/content-management-page/content-management-page.component';
import { ContentDetailPageComponent } from './pages/content-detail-page/content-detail-page.component';

export const CONTENT_ROUTES: Routes = [
  {
    path: 'skills',
    canActivate: [permissionGuard],
    data: { permissions: [...SKILL_HUB_PERMISSIONS] },
    loadComponent: () =>
      import('./pages/skill-hub-page/skill-hub-page.component').then((m) => m.SkillHubPageComponent),
  },
  {
    path: 'global-announcements',
    canActivate: [permissionGuard],
    data: { permissions: [ANNOUNCEMENT_GLOBAL_MANAGE_PERMISSION] },
    loadComponent: () =>
      import('./pages/global-announcement-management-page/global-announcement-management-page.component').then(
        (m) => m.GlobalAnnouncementManagementPageComponent,
      ),
  },
  {
    path: ':tab/:contentId',
    canActivate: [permissionGuard],
    data: { permissions: [...PROJECT_GOVERNANCE_PERMISSIONS] },
    component: ContentDetailPageComponent,
  },
  {
    path: '',
    canActivate: [permissionGuard],
    data: { permissions: [...PROJECT_GOVERNANCE_PERMISSIONS] },
    component: ContentManagementPageComponent,
  },
];
