import { Routes } from '@angular/router';

export const EXPENSE_ROUTES: Routes = [
    {
        path: 'new',
        loadComponent: () =>
            import('./pages/add-expense/add-expense').then((m) => m.AddExpense),
    },
    {
        path: 'detail/:id',
        loadComponent: () =>
            import('./pages/expense-detail/expense-detail').then((m) => m.ExpenseDetail),
    },
    {
        path: 'edit/:id',
        loadComponent: () =>
            import('./pages/add-expense/add-expense').then((m) => m.AddExpense),
    },
];
