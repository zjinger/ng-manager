import { inject, Injectable, signal } from '@angular/core';
import { MenuItem } from './menu.model';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class MenuService {
  currentMenu = signal<MenuItem | null>(null);

  private router = inject(Router);

  private menus: MenuItem[] = [
    { title: "仪表盘", path: "/dashboard", icon: "dashboard", level: 1 },
    {
      title: "项目管理", path: "/projects", icon: "project", level: 1,
    },
    { title: "任务管理", path: "/tasks", icon: "check-circle", level: 1 },
    { title: "系统设置", path: "/settings", icon: "setting", level: 1 },
  ];

  getMenus(): MenuItem[] {
    return this.menus;
  }

  clickMenu(item: MenuItem) {
    if (item.path) {
      this.router.navigate([item.path]);
    }
    this.currentMenu.set(item);
  }
}
