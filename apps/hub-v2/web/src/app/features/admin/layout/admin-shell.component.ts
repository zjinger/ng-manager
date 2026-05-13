import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMenuModule } from 'ng-zorro-antd/menu';

import { AuthService, AuthStore } from '@core/auth';

type AdminNavItem = {
  key: string;
  label: string;
  icon: string;
  route: string;
  badge?: string;
  badgeTone?: 'danger' | 'info';
};

type AdminNavSection = {
  label: string;
  items: AdminNavItem[];
};

const ADMIN_NAV: AdminNavSection[] = [
  {
    label: '总览',
    items: [
      { key: 'dashboard', label: '仪表盘', icon: 'dashboard', route: '/admin' },
    ],
  },
  {
    label: '组织与账号',
    items: [
      { key: 'users', label: '用户管理', icon: 'team', route: '/admin/users' },
      { key: 'departments', label: '部门组织', icon: 'cluster', route: '/admin/departments' },
      { key: 'groups', label: '用户组', icon: 'usergroup-add', route: '/admin/groups' },
    ],
  },
  {
    label: '权限与治理',
    items: [
      { key: 'roles', label: '角色管理', icon: 'safety-certificate', route: '/admin/roles' },
      { key: 'permissions', label: '权限配置', icon: 'key', route: '/admin/permissions' },
      { key: 'projects', label: '项目治理', icon: 'appstore', route: '/admin/projects' },
      { key: 'audit', label: '审计日志', icon: 'audit', route: '/admin/audit', badge: '占位', badgeTone: 'info' },
    ],
  },
  {
    label: '系统',
    items: [
      { key: 'settings', label: '系统设置', icon: 'setting', route: '/admin/settings' },
    ],
  },
];

const ADMIN_LABELS: Record<string, string> = {
  '/admin': '仪表盘',
  '/admin/users': '用户管理',
  '/admin/departments': '部门组织',
  '/admin/projects': '项目治理',
  '/admin/roles': '角色管理',
  '/admin/permissions': '权限配置',
  '/admin/audit': '审计日志',
  '/admin/groups': '用户组',
  '/admin/settings': '系统设置',
};

@Component({
  selector: 'app-admin-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, NzButtonModule, NzDropDownModule, NzIconModule, NzMenuModule],
  templateUrl: './admin-shell.component.html',
  styleUrl: './admin-shell.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminShellComponent {
  private readonly authService = inject(AuthService);
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly navSections = ADMIN_NAV;
  readonly currentUrl = signal(this.router.url.split('?')[0].split('#')[0]);
  readonly currentUser = this.authStore.currentUser;
  readonly userInitial = computed(() =>
    (this.currentUser()?.nickname || this.currentUser()?.username || 'A').slice(0, 1)
  );
  readonly currentLabel = computed(() => {
    const path = this.currentUrl();
    const match = Object.entries(ADMIN_LABELS)
      .sort((left, right) => right[0].length - left[0].length)
      .find(([route]) => path === route || (route !== '/admin' && path.startsWith(route)));
    return match?.[1] ?? '系统管理后台';
  });

  constructor() {
    this.router.events.pipe(
      takeUntilDestroyed(this.destroyRef),
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url.split('?')[0].split('#')[0]),
    ).subscribe((url) => this.currentUrl.set(url));
  }

  logout(): void {
    this.authService.logout().subscribe();
  }
}
