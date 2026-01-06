import { NgTemplateOutlet } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { MenuItem } from './menu.model';
import { MenuService } from './menu.service';

@Component({
  selector: 'ngm-menu',
  imports: [NgTemplateOutlet, NzMenuModule, NzIconModule, RouterModule],
  templateUrl: './layout-menu.component.html',
  styleUrl: './layout-menu.component.less',
})
export class LayoutMenuComponent {
  @Input() isCollapsed = false;
  menus: MenuItem[] = []
  constructor(public menuService: MenuService) {
    this.menus = this.menuService.getMenus();
  }
  isActive(path: string) {
    // return this.router.url.startsWith(path);
    const curPath = this.menuService.currentMenu()?.path;
    console.log('curPath', curPath, path);
    return curPath === path;
  }
}
