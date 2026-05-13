import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import type { NavSection } from '@core/navigation/menu.types';
import { UiStore } from '@core/state/ui.store';
import { SidebarComponent } from '@core/layout/sidebar/sidebar.component';
import { TopbarComponent } from '@core/layout/topbar/topbar.component';

const ADMIN_NAV: NavSection[] = [
  {
    key: 'overview',
    label: '总览',
    items: [
      { key: 'dashboard', label: '仪表盘', icon: 'dashboard', route: '/admin', exact: true },
    ],
  },
  {
    key: 'organization',
    label: '组织与账号',
    items: [
      { key: 'users', label: '用户管理', icon: 'team', route: '/admin/users' },
      { key: 'departments', label: '部门组织', icon: 'cluster', route: '/admin/departments' },
      { key: 'groups', label: '用户组', icon: 'usergroup-add', route: '/admin/groups' },
    ],
  },
  {
    key: 'governance',
    label: '权限与治理',
    items: [
      { key: 'roles', label: '角色管理', icon: 'safety-certificate', route: '/admin/roles' },
      { key: 'permissions', label: '权限配置', icon: 'key', route: '/admin/permissions' },
      { key: 'projects', label: '项目治理', icon: 'appstore', route: '/admin/projects' },
      { key: 'audit', label: '审计日志', icon: 'audit', route: '/admin/audit', badge: '占位', tone: 'info' },
    ],
  },
  {
    key: 'system',
    label: '系统',
    items: [
      { key: 'settings', label: '系统设置', icon: 'setting', route: '/admin/settings' },
    ],
  },
];

@Component({
  selector: 'app-admin-shell',
  imports: [RouterOutlet, SidebarComponent, TopbarComponent],
  templateUrl: './admin-shell.component.html',
  styleUrl: '../../../core/layout/app-shell/app-shell.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminShellComponent {
  readonly navSections = ADMIN_NAV;
  readonly uiStore = inject(UiStore);
}
