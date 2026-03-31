import { Routes } from '@angular/router';
import { adminAuthGuard, loginPageGuard } from './core/guards/auth.guards';
import { LoginComponent } from './pages/login/login.component';
import { migrationGuard } from './core/migration/migration.guard';

export const routes: Routes = [
   {
    path: '',
    loadComponent: () =>
      import('./pages/redirect/redirect.component').then((m) => m.RedirectComponent)
  },
  {
    path: 'migration',
    loadComponent: () =>
      import('./pages/migration/migration.component').then((m) => m.MigrationComponent)
  },
  { path: 'login', component: LoginComponent, canActivate: [loginPageGuard] },
  // { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard-page.component').then(m => m.DashboardPageComponent), canActivate: [migrationGuard, adminAuthGuard] },
  { path: 'profile', loadComponent: () => import('./pages/profile/profile.component').then(m => m.ProfilePageComponent), canActivate: [migrationGuard, adminAuthGuard] },
  { path: 'announcements', loadComponent: () => import('./pages/announcements/announcements.component').then(m => m.AnnouncementsPageComponent), canActivate: [migrationGuard, adminAuthGuard] },
  { path: 'projects', loadComponent: () => import('./pages/projects/projects.component').then(m => m.ProjectsPageComponent), canActivate: [migrationGuard, adminAuthGuard] },
  { path: 'rd', loadComponent: () => import('./pages/rd/rd.component').then(m => m.RdPageComponent), canActivate: [migrationGuard, adminAuthGuard] },
  { path: 'users', loadComponent: () => import('./pages/users/users.component').then(m => m.UsersPageComponent), canActivate: [migrationGuard, adminAuthGuard] },
  { path: 'docs/new', loadComponent: () => import('./pages/docs/docs-create.component').then(m => m.DocsCreatePageComponent), canActivate: [migrationGuard, adminAuthGuard] },
  { path: 'docs', loadComponent: () => import('./pages/docs/docs.component').then(m => m.DocsPageComponent), canActivate: [migrationGuard, adminAuthGuard] },
  { path: 'feedback', loadComponent: () => import('./pages/feedback/feedback.component').then(m => m.FeedbackPageComponent), canActivate: [migrationGuard, adminAuthGuard] },
  { path: 'issues/new', loadComponent: () => import('./pages/issues/issue-create.component').then(m => m.IssueCreatePageComponent), canActivate: [migrationGuard, adminAuthGuard] },
  { path: 'issues', loadComponent: () => import('./pages/issues/issues.component').then(m => m.IssuesPageComponent), canActivate: [migrationGuard, adminAuthGuard] },
  { path: 'releases', loadComponent: () => import('./pages/releases/releases.component').then(m => m.ReleasesPageComponent), canActivate: [migrationGuard, adminAuthGuard] },
  // { path: '**', redirectTo: 'dashboard' }
  {
    path: '**',
    loadComponent: () =>
      import('./pages/redirect/redirect.component').then((m) => m.RedirectComponent)
  }
];
