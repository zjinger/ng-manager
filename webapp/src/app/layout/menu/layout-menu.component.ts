import { Component, Input } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { MenuItem } from './menu.model';
import { Router, RouterModule } from '@angular/router';
import { NgTemplateOutlet } from '@angular/common';
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
  constructor(public router: Router, private menuService: MenuService) {
    this.menus = this.menuService.getMenus();
  }
  isActive(path: string) {
    return this.router.url.startsWith(path);
  }

  onMenuClick(item: MenuItem) {
    if (item.path) {
      this.router.navigate([item.path]);
    }
  }

}
