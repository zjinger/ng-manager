import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { LayoutStateService } from '../layout.state.service';
import { LayoutMenuComponent } from '../menu/layout-menu.component';
import { LayoutProjectNavComponent } from "../project-nav/layout-project-nav.component";

@Component({
  selector: 'ngm-sidebar',
  imports: [
    NzLayoutModule,
    NzIconModule,
    NzMenuModule,
    LayoutMenuComponent,
    LayoutProjectNavComponent,
    NzButtonModule,
    NzDropDownModule,
    RouterModule,
  ],
  templateUrl: './layout-sidebar.component.html',
  styleUrl: './layout-sidebar.component.less',
  host: {
    '[class.collapsed]': 'isCollapsed()',
    '[class.ant-layout-sider]': 'true'
  }
})
export class LayoutSidebarComponent {
  public router: Router = inject(Router)
  private state: LayoutStateService = inject(LayoutStateService);
  isCollapsed = this.state.isCollapsed;
  constructor() { }
  isActive(path: string) {
    return this.router.url.startsWith(path);
  }
}
