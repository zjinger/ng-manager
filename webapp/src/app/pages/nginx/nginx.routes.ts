import { Routes } from '@angular/router';
import { NginxComponent } from './nginx.component';

/**
 * Nginx 管理路由配置
 */
export const NGINX_ROUTES: Routes = [
  {
    path: '',
    component: NginxComponent,
    title: 'Nginx 管理',
  },
];
