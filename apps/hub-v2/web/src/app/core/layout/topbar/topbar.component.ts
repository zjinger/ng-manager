import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzIconModule } from 'ng-zorro-antd/icon';

import { AuthService } from '../../auth/auth.service';
import { AuthStore } from '../../auth/auth.store';
import { BreadcrumbService } from '../../navigation/breadcrumb.service';
import { ProjectContextStore } from '../../state/project-context.store';
import { UiStore } from '../../state/ui.store';
import { NotificationBellComponent } from '../../../features/notifications/components/notification-bell/notification-bell.component';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [RouterLink, NzButtonModule, NzDropDownModule, NzIconModule, NotificationBellComponent],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopbarComponent {
  private readonly authService = inject(AuthService);
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly breadcrumb = inject(BreadcrumbService);
  readonly projectContext = inject(ProjectContextStore);
  readonly uiStore = inject(UiStore);

  readonly currentUser = this.authStore.currentUser;
  readonly breadcrumbs = computed(() => this.breadcrumb.getBreadcrumbs(this.router.url));
  readonly currentLabel = computed(() => this.breadcrumb.getCurrentLabel(this.router.url));
  readonly sidebarCollapsed = this.uiStore.sidebarCollapsed;
  readonly isDark = this.uiStore.isDark;
  readonly userInitial = computed(() =>
    (this.currentUser()?.nickname || this.currentUser()?.username || 'U').slice(0, 1)
  );

  logout(): void {
    this.projectContext.reset();
    this.authService.logout().subscribe();
  }

  toggleSidebar(): void {
    this.uiStore.toggleSidebar();
  }

  toggleTheme(): void {
    this.uiStore.toggleTheme();
  }
}
