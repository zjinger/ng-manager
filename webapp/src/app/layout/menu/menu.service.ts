import { Injectable } from '@angular/core';
import { MenuItem } from './menu.model';

@Injectable({
  providedIn: 'root',
})
export class MenuService {
  private menus: MenuItem[] = [
    { title: "Dashboard", path: "/dashboard", icon: "dashboard", level: 1 },
    { title: "Projects", path: "/projects", icon: "project", level: 1 },
    { title: "Tasks", path: "/tasks", icon: "check-circle", level: 1 },
    { title: "Settings", path: "/settings", icon: "setting", level: 1 },
  ];

  getMenus(): MenuItem[] {
    return this.menus;
  }
}
