import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: '', loadComponent: () => import('./about.component').then(m => m.AboutComponent) },
  { path: 'feedback', loadComponent: () => import('./feedback.component').then(m => m.FeedbackComponent) }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AboutRoutingModule { }
