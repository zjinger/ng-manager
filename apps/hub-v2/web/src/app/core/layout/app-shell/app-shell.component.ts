import { Component, DestroyRef, HostListener, effect, inject, OnDestroy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';

import { NAV_ITEMS } from '../../navigation/nav.config';
import { NavigationBadgeStore } from '../../navigation/navigation-badge.store';
import { RealtimeSyncService } from '../../realtime/realtime-sync.service';
import { ProjectContextStore } from '../../state/project-context.store';
import { UiStore } from '../../state/ui.store';
import { SystemNotificationService } from '../../../shared/services/system-notification.service';
import { GlobalSearchModalComponent } from '../../../features/search/components/global-search-modal/global-search-modal.component';
import { GlobalSearchStore } from '../../../features/search/store/global-search.store';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent, GlobalSearchModalComponent],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.less',
})
export class AppShellComponent implements OnDestroy {
  readonly navItems = NAV_ITEMS;
  readonly uiStore = inject(UiStore);
  private readonly projectContext = inject(ProjectContextStore);
  private readonly navigationBadgeStore = inject(NavigationBadgeStore);
  private readonly realtimeSync = inject(RealtimeSyncService);
  private readonly globalSearchStore = inject(GlobalSearchStore);
  private readonly systemNotification = inject(SystemNotificationService);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.realtimeSync.start();

    this.projectContext
      .loadProjects({ refreshScope: true })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          if (!this.projectContext.systemNotificationEnabled()) {
            return;
          }
          void this.systemNotification.checkAndPromptPermission();
        },
      });

    effect(() => {
      const projectId = this.projectContext.currentProjectId();
      if (!projectId) {
        return;
      }
      this.navigationBadgeStore.load({ force: true });
    });
  }

  ngOnDestroy(): void {
    this.realtimeSync.stop();
  }

  @HostListener('window:keydown', ['$event'])
  onWindowKeydown(event: KeyboardEvent): void {
    if (!(event.ctrlKey || event.metaKey)) {
      return;
    }
    if (event.key.toLowerCase() !== 'k') {
      return;
    }
    event.preventDefault();
    this.globalSearchStore.openPanel();
  }
}
