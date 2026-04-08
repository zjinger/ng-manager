import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterEvent, RouterModule } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzIconModule } from 'ng-zorro-antd/icon';

import { NotificationBellComponent } from '../../../features/notifications/components/notification-bell/notification-bell.component';
import { GlobalSearchStore } from '../../../features/search/store/global-search.store';
import { AuthService } from '../../auth/auth.service';
import { AuthStore } from '../../auth/auth.store';
import { BreadcrumbService } from '../../navigation/breadcrumb.service';
import { WsClientService } from '../../realtime/ws-client.service';
import { ProjectContextStore } from '../../state/project-context.store';
import { UiStore } from '../../state/ui.store';
import { filter, map } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [RouterModule, NzButtonModule, NzDropDownModule, NzIconModule, NotificationBellComponent],
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
  private readonly globalSearchStore = inject(GlobalSearchStore);
  private currentUrl = signal(this.router.url);
  private readonly destroyRef = inject(DestroyRef);
  readonly currentUser = this.authStore.currentUser;
  readonly breadcrumbs = computed(() => this.breadcrumb.getBreadcrumbs(this.currentUrl()));
  readonly currentLabel = computed(() => this.breadcrumb.getCurrentLabel(this.currentUrl()));
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
    // 最后一次路由变化
    this.router.events.pipe(
      takeUntilDestroyed(this.destroyRef),
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url),
    ).subscribe((url) => {
      this.currentUrl.set(url);
    })
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

  openGlobalSearch(): void {
    this.globalSearchStore.openPanel();
  }
}
