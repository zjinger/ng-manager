import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';

type NavItem = {
  label: string;
  path: string;
};

@Component({
  selector: 'ngm-sidebar',
  imports: [],
  templateUrl: './layout-sidebar.component.html',
  styleUrl: './layout-sidebar.component.less',
})
export class LayoutSidebarComponent {
  @Input() collapsed = false;

  nav: NavItem[] = [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Projects", path: "/projects" },
    { label: "Tasks", path: "/tasks" },
    { label: "Settings", path: "/settings" },
  ];

  constructor(public router: Router) { }

  isActive(path: string) {
    return this.router.url.startsWith(path);
  }
}
