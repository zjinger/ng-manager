import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NzIconModule } from 'ng-zorro-antd/icon';

import { AuthStore } from '../../auth/auth.store';
import { NavigationBadgeStore } from '../../navigation/navigation-badge.store';
import type { NavSection } from '../../navigation/menu.types';
import { UiStore } from '../../state/ui.store';
import { ProjectSwitcherComponent } from '../project-switcher/project-switcher.component';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NzIconModule, ProjectSwitcherComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  readonly items = input.required<NavSection[]>();
  readonly collapsed = input(false);
  readonly currentUser = inject(AuthStore).currentUser;
  readonly uiStore = inject(UiStore);
  private readonly badgeStore = inject(NavigationBadgeStore);

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
