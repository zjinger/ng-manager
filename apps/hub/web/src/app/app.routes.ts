import { Routes } from '@angular/router';
import { adminAuthGuard, loginPageGuard } from './core/guards/auth.guards';
import { LoginComponent } from './pages/login/login.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [loginPageGuard] },
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard-page.component').then(m => m.DashboardPageComponent), canActivate: [adminAuthGuard] },
  { path: 'profile', loadComponent: () => import('./pages/profile/profile.component').then(m => m.ProfilePageComponent), canActivate: [adminAuthGuard] },
  { path: 'announcements', loadComponent: () => import('./pages/announcements/announcements.component').then(m => m.AnnouncementsPageComponent), canActivate: [adminAuthGuard] },
  { path: 'projects', loadComponent: () => import('./pages/projects/projects.component').then(m => m.ProjectsPageComponent), canActivate: [adminAuthGuard] },
  { path: 'users', loadComponent: () => import('./pages/users/users.component').then(m => m.UsersPageComponent), canActivate: [adminAuthGuard] },
  { path: 'docs', loadComponent: () => import('./pages/docs/docs.component').then(m => m.DocsPageComponent), canActivate: [adminAuthGuard] },
  { path: 'feedback', loadComponent: () => import('./pages/feedback/feedback.component').then(m => m.FeedbackPageComponent), canActivate: [adminAuthGuard] },
  { path: 'issues/new', loadComponent: () => import('./pages/issues/issue-create.component').then(m => m.IssueCreatePageComponent), canActivate: [adminAuthGuard] },
  { path: 'issues', loadComponent: () => import('./pages/issues/issues.component').then(m => m.IssuesPageComponent), canActivate: [adminAuthGuard] },
  { path: 'releases', loadComponent: () => import('./pages/releases/releases.component').then(m => m.ReleasesPageComponent), canActivate: [adminAuthGuard] },
  { path: '**', redirectTo: 'dashboard' }
];

