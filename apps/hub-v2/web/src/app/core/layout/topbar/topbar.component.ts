import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzIconModule } from 'ng-zorro-antd/icon';

import { AuthService } from '../../auth/auth.service';
import { AuthStore } from '../../auth/auth.store';
import { BreadcrumbService } from '../../navigation/breadcrumb.service';
import { WsClientService } from '../../realtime/ws-client.service';
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
  readonly wsClient = inject(WsClientService);

  readonly currentUser = this.authStore.currentUser;
  readonly breadcrumbs = computed(() => this.breadcrumb.getBreadcrumbs(this.router.url));
  readonly currentLabel = computed(() => this.breadcrumb.getCurrentLabel(this.router.url));
  readonly sidebarCollapsed = this.uiStore.sidebarCollapsed;
  readonly isDark = this.uiStore.isDark;
  readonly avatarLoadFailed = signal(false);
  readonly userInitial = computed(() =>
    (this.currentUser()?.nickname || this.currentUser()?.username || 'U').slice(0, 1)
  );
  readonly showAvatarImage = computed(() => !!this.currentUser()?.avatarUrl && !this.avatarLoadFailed());
  readonly wsState = this.wsClient.connectionState;
  readonly wsStateLabel = computed(() => {
    const state = this.wsState();
    if (state === 'connected') {
      return '实时连接正常';
    }
    if (state === 'reconnecting') {
      return '实时连接重连中';
    }
    if (state === 'connecting') {
      return '实时连接建立中';
    }
    return '实时连接已断开';
  });
  readonly wsStateTone = computed(() => {
    const state = this.wsState();
    if (state === 'connected') {
      return 'ok';
    }
    if (state === 'reconnecting' || state === 'connecting') {
      return 'warn';
    }
    return 'down';
  });

  constructor() {
    effect(() => {
      this.currentUser()?.avatarUrl;
      this.avatarLoadFailed.set(false);
    });
  }

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

  onAvatarError(): void {
    this.avatarLoadFailed.set(true);
  }
}
