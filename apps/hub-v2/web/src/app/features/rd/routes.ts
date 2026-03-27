import { Routes } from '@angular/router';

import { RdBoardPageComponent } from './pages/rd-board-page/rd-board-page.component';
import { RdDetailPageComponent } from './pages/rd-detail-page/rd-detail-page.component';

export const RD_ROUTES: Routes = [
  { path: ':itemId', component: RdDetailPageComponent },
  { path: '', component: RdBoardPageComponent },
];
