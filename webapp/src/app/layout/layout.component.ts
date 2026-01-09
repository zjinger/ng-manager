import { Component, inject, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { LayoutHeaderComponent } from "./header/layout-header.component";
import { LayoutSidebarComponent } from './sidebar/layout-sidebar.component';
import { WsClientService } from '@app/core';
@Component({
  selector: 'ngm-layout',
  imports: [
    RouterModule,
    NzLayoutModule,
    NzBreadCrumbModule,
    NzIconModule,
    NzMenuModule,
    LayoutSidebarComponent,
    LayoutHeaderComponent
  ],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.less',
})
export class LayoutComponent implements OnInit {
  isCollapsed = false;
  private wsClient = inject(WsClientService)
  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
  }
  ngOnInit(): void {
    this.wsClient.connect();
  }
}
