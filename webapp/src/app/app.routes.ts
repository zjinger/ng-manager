import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
    },
    {
        path: 'dashboard',
        loadChildren: () => import('./pages/dashboard/dashboard-module').then(m => m.DashboardModule)
    },
    {
        path: 'tasks',
        loadChildren: () => import('./pages/tasks/tasks-module').then(m => m.TasksModule)
    },
    {
        path: 'projects',
        loadChildren: () => import('./pages/projects/projects-module').then(m => m.ProjectsModule)
    },
    {
        path: 'settings',
        loadChildren: () => import('./pages/setting/setting-module').then(m => m.SettingModule)
    }
];
