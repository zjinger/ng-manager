import { Component, DestroyRef, effect, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';

import { NAV_ITEMS } from '../../navigation/nav.config';
import { NavigationBadgeStore } from '../../navigation/navigation-badge.store';
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
export class AppShellComponent {
  readonly navItems = NAV_ITEMS;
  readonly uiStore = inject(UiStore);
  private readonly projectContext = inject(ProjectContextStore);
  private readonly navigationBadgeStore = inject(NavigationBadgeStore);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
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
}
