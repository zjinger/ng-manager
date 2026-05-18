import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NzIconModule } from 'ng-zorro-antd/icon';

import { HasPermissionDirective } from '../../auth/has-permission.directive';
import { NavigationBadgeStore } from '../../navigation/navigation-badge.store';
import type { NavItem, NavSection } from '../../navigation/menu.types';
import { UiStore } from '../../state/ui.store';
import { ProjectSwitcherComponent } from '../project-switcher/project-switcher.component';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NzIconModule, ProjectSwitcherComponent, HasPermissionDirective],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  readonly items = input.required<NavSection[]>();
  readonly collapsed = input(false);
  readonly showProjectSwitcher = input(true);
  readonly brandName = input('深蓝协作平台');
  readonly brandBadge = input('v2');
  readonly brandRoute = input('/dashboard');
  readonly brandLogo = input('/logo.svg');
  readonly brandLogoAlt = input('深蓝协作平台');
  readonly uiStore = inject(UiStore);
  private readonly badgeStore = inject(NavigationBadgeStore);

  itemPermissions(item: NavItem): string[] {
    return item.permissions ?? [];
  }

  itemPermissionMode(item: NavItem): 'any' | 'all' {
    return item.permissionMode ?? 'any';
  }

  badgeFor(key: string): string | null {
    if (key === 'issues') {
      const count = this.badgeStore.issueCount();
      return count > 0 ? String(count) : null;
    }

    if (key === 'rd') {
      const count = this.badgeStore.rdCount();
      return count > 0 ? String(count) : null;
    }

    return null;
  }
}
