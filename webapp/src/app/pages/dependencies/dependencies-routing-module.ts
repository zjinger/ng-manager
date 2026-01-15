import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProjectDepsComponent } from './project-deps.component';

const routes: Routes = [
  { path: '', component: ProjectDepsComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DependenciesRoutingModule { }
