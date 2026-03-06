import { Routes } from '@angular/router';
import { AnnouncementsPageComponent } from './pages/announcements/announcements.component';
import { DashboardPageComponent } from './pages/dashboard/dashboard-page.component';
import { DocsPageComponent } from './pages/docs/docs.page';
import { FeedbackPageComponent } from './pages/feedback/feedback.component';
import { ReleasesPageComponent } from './pages/releases/releases.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', component: DashboardPageComponent },
  { path: 'announcements', component: AnnouncementsPageComponent },
  { path: 'docs', component: DocsPageComponent },
  { path: 'feedback', component: FeedbackPageComponent },
  { path: 'releases', component: ReleasesPageComponent },
  { path: '**', redirectTo: 'dashboard' }
];
