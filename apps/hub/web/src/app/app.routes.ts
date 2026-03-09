import { Routes } from '@angular/router';
import { adminAuthGuard, loginPageGuard } from './core/guards/auth.guards';
import { AnnouncementsPageComponent } from './pages/announcements/announcements.component';
import { DashboardPageComponent } from './pages/dashboard/dashboard-page.component';
import { DocsPageComponent } from './pages/docs/docs.component';
import { FeedbackPageComponent } from './pages/feedback/feedback.component';
import { LoginComponent } from './pages/login/login.component';
import { ReleasesPageComponent } from './pages/releases/releases.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [loginPageGuard] },
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', component: DashboardPageComponent, canActivate: [adminAuthGuard] },
  { path: 'announcements', component: AnnouncementsPageComponent, canActivate: [adminAuthGuard] },
  { path: 'docs', component: DocsPageComponent, canActivate: [adminAuthGuard] },
  { path: 'feedback', component: FeedbackPageComponent, canActivate: [adminAuthGuard] },
  { path: 'releases', component: ReleasesPageComponent, canActivate: [adminAuthGuard] },
  { path: '**', redirectTo: 'dashboard' }
];