import { Injectable } from '@angular/core';
import { MenuItem } from './menu.model';

@Injectable({
  providedIn: 'root',
})
export class MenuService {
  private menus: MenuItem[] = [
    { title: "Dashboard", path: "/dashboard", icon: "dashboard", level: 1 },
    {
      title: "项目管理", icon: "project", level: 1,
      children: [
        { title: "项目列表", path: "/projects", icon: "unordered-list", level: 2 },
        { title: "创建项目", path: "/projects/create", icon: "plus-circle", level: 2 },
        { title: "导入项目", path: "/projects/import", icon: "upload", level: 2 },
      ]
    },
    { title: "Tasks", path: "/tasks", icon: "check-circle", level: 1 },
    { title: "Settings", path: "/settings", icon: "setting", level: 1 },
  ];

  getMenus(): MenuItem[] {
    return this.menus;
  }
}
