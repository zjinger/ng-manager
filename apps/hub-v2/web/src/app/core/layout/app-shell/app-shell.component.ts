import { Component, DestroyRef, effect, inject, OnDestroy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';

import { NAV_ITEMS } from '../../navigation/nav.config';
import { NavigationBadgeStore } from '../../navigation/navigation-badge.store';
import { RealtimeSyncService } from '../../realtime/realtime-sync.service';
import { ProjectContextStore } from '../../state/project-context.store';
import { UiStore } from '../../state/ui.store';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.less',
})
export class AppShellComponent implements OnDestroy {
  readonly navItems = NAV_ITEMS;
  readonly uiStore = inject(UiStore);
  private readonly projectContext = inject(ProjectContextStore);
  private readonly navigationBadgeStore = inject(NavigationBadgeStore);
  private readonly realtimeSync = inject(RealtimeSyncService);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.realtimeSync.start();

    this.projectContext
      .loadProjects()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.navigationBadgeStore.load();
        },
      });

    effect(() => {
      this.projectContext.currentProjectId();
      this.navigationBadgeStore.load();
    });
  }

  ngOnDestroy(): void {
    this.realtimeSync.stop();
  }
}
