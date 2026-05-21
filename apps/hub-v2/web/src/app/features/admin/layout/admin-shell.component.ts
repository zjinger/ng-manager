import { ChangeDetectionStrategy, Component, HostListener, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import type { NavSection } from '@core/navigation/menu.types';
import { UiStore } from '@core/state/ui.store';
import { SidebarComponent } from '@core/layout/sidebar/sidebar.component';
import { TopbarComponent } from '@core/layout/topbar/topbar.component';
import { GlobalSearchModalComponent } from '../../search/components/global-search-modal/global-search-modal.component';
import { GlobalSearchStore } from '../../search/store/global-search.store';

const ADMIN_NAV: NavSection[] = [
  {
    key: 'overview',
    label: '总览',
    items: [
      { key: 'dashboard', label: '仪表盘', icon: 'dashboard', route: '/admin', exact: true, permissions: ['admin.dashboard.view'] },
    ],
  },
  {
    key: 'organization',
    label: '用户与组织',
    items: [
      { key: 'users', label: '用户管理', icon: 'team', route: '/admin/users', permissions: ['admin.users.manage'] },
      { key: 'departments', label: '部门组织', icon: 'cluster', route: '/admin/departments', permissions: ['admin.departments.manage'] },
      // { key: 'groups', label: '用户组', icon: 'usergroup-add', route: '/admin/groups' },
    ],
  },
  {
    key: 'governance',
    label: '角色与权限',
    items: [
      { key: 'roles', label: '角色管理', icon: 'safety-certificate', route: '/admin/roles', permissions: ['admin.roles.manage'] },
      { key: 'permissions', label: '权限配置', icon: 'key', route: '/admin/permissions', permissions: ['admin.roles.manage'] },
      { key: 'permission-items', label: '权限项管理', icon: 'unordered-list', route: '/admin/permission-items', permissions: ['admin.roles.manage'] },
    ],
  },
  {
    key: 'system',
    label: '系统与日志',
    items: [
      { key: 'titles', label: '全局职务库', icon: 'idcard', route: '/admin/titles', permissions: ['admin.users.manage'] },
      { key: 'audit', label: '审计日志', icon: 'audit', route: '/admin/audit', permissions: ['admin.audit.view'] },
      { key: 'settings', label: '系统设置', icon: 'setting', route: '/admin/settings', permissions: ['admin.settings.manage'] },
    ],
  },
];

@Component({
  selector: 'app-admin-shell',
  imports: [RouterOutlet, SidebarComponent, TopbarComponent, GlobalSearchModalComponent],
  templateUrl: './admin-shell.component.html',
  styleUrl: '../../../core/layout/app-shell/app-shell.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminShellComponent {
  readonly navSections = ADMIN_NAV;
  readonly uiStore = inject(UiStore);
  private readonly globalSearchStore = inject(GlobalSearchStore);

  @HostListener('window:keydown', ['$event'])
  onWindowKeydown(event: KeyboardEvent): void {
    if (!(event.ctrlKey || event.metaKey)) {
      return;
    }
    if (event.key.toLowerCase() !== 'k') {
      return;
    }
    event.preventDefault();
    this.globalSearchStore.openPanel('', 'admin');
  }
}
