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
    },
    {
        path: 'configuration',
        loadChildren: () => import('./pages/configuration/configuration.module').then(m => m.ConfigurationModule)
    },
    {
        path: 'dependencies',
        loadChildren: () => import('./pages/dependencies/dependencies.module').then(m => m.DependenciesModule)
    },
    {
        path: 'rquest',
        loadChildren: () => import('./pages/api-client/api-client.module').then(m => m.ApiClientModule)
    },
    {
        path: 'sprite',
        loadChildren: () => import('./pages/sprite/sprite.module').then(m => m.SpriteModule)
    },
    {
        path:'rd',
        loadChildren: () => import('./pages/rd/rd.module').then(m => m.RdModule)
    },
    {
        path:'issues',
        loadChildren: () => import('./pages/issues/issues.module').then(m => m.IssuesModule)
    },
    {
        path: 'about',
        loadChildren: () => import('./pages/about/about-routing-module').then(m => m.AboutRoutingModule)
    },
    {
        path: '**',
        redirectTo: 'dashboard'
    }
];
