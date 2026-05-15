import { Routes } from '@angular/router';
import { ExpensesListPage } from './pages/expenses-list-page/expenses-list-page';
export const MY_EXPENSES_ROUTES: Routes = [
  {
    path: '',
    component: ExpensesListPage,
  },
];
