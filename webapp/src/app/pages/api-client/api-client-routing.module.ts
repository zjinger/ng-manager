import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ApiClientComponent } from './api-client.component';

const routes: Routes = [
  { path: '', component: ApiClientComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ApiClientRoutingModule { }
