import { Component } from '@angular/core';
import { LayoutRightPanelComponent } from './right-panel/layout-right-panel.component';
import { LayoutHeaderComponent } from './header/layout-header.component';
import { LayoutSidebarComponent } from './sidebar/layout-sidebar.component';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'ngm-layout',
  imports: [
    RouterModule,
    LayoutHeaderComponent,
    LayoutSidebarComponent,
    LayoutRightPanelComponent,
  ],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.less',
})
export class LayoutComponent {
  sidebarCollapsed = false;
  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }
}
