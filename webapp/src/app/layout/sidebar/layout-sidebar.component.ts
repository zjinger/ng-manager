import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { LayoutMenuComponent } from '../menu/layout-menu.component';
import { LayoutProjectNavComponent } from "../project-nav/layout-project-nav.component";

@Component({
  selector: 'ngm-sidebar',
  imports: [NzLayoutModule, NzIconModule, NzMenuModule, LayoutMenuComponent, LayoutProjectNavComponent],
  templateUrl: './layout-sidebar.component.html',
  styleUrl: './layout-sidebar.component.less',
  host: {
    '[class.collapsed]': 'isCollapsed',
    '[class.ant-layout-sider]': 'true'
  }
})
export class LayoutSidebarComponent {
  @Input() isCollapsed = false;
  constructor(public router: Router) { }
  isActive(path: string) {
    return this.router.url.startsWith(path);
  }
}
