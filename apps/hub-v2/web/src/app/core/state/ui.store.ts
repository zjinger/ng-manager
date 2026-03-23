import { DOCUMENT } from '@angular/common';
import { computed, effect, Inject, Injectable, signal } from '@angular/core';

type ThemeMode = 'light' | 'dark';
const THEME_STORAGE_KEY = 'hub-v2-theme';

@Injectable({ providedIn: 'root' })
export class UiStore {
  private readonly sidebarCollapsedState = signal(false);
  private readonly themeState = signal<ThemeMode>('light');

  readonly sidebarCollapsed = computed(() => this.sidebarCollapsedState());
  readonly theme = computed(() => this.themeState());
  readonly isDark = computed(() => this.themeState() === 'dark');

  constructor(@Inject(DOCUMENT) private readonly document: Document) {
    const saved = this.document.defaultView?.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') {
      this.themeState.set(saved);
    }

    effect(() => {
      const theme = this.themeState();
      this.document.documentElement.dataset['theme'] = theme;
      this.document.body.dataset['theme'] = theme;
      this.document.defaultView?.localStorage.setItem(THEME_STORAGE_KEY, theme);
    });
  }

  toggleSidebar(): void {
    this.sidebarCollapsedState.update((value) => !value);
  }

  setSidebarCollapsed(collapsed: boolean): void {
    this.sidebarCollapsedState.set(collapsed);
  }

  toggleTheme(): void {
    this.themeState.update((value) => (value === 'dark' ? 'light' : 'dark'));
  }

  setTheme(theme: ThemeMode): void {
    this.themeState.set(theme);
  }
}
