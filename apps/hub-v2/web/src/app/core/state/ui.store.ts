import { DOCUMENT } from '@angular/common';
import { computed, Inject, Injectable, signal } from '@angular/core';

type ThemeMode = 'light' | 'dark';
type ThemeType = 'default' | 'dark';
const THEME_STORAGE_KEY = 'hub-v2-theme';

@Injectable({ providedIn: 'root' })
export class UiStore {
  private readonly sidebarCollapsedState = signal(false);
  private readonly themeState = signal<ThemeType>('default');

  readonly sidebarCollapsed = computed(() => this.sidebarCollapsedState());
  readonly theme = computed<ThemeMode>(() => (this.themeState() === 'dark' ? 'dark' : 'light'));
  readonly isDark = computed(() => this.themeState() === 'dark');

  constructor(@Inject(DOCUMENT) private readonly document: Document) {
    const saved = this.document.defaultView?.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark') {
      this.themeState.set('dark');
    }
  }

  toggleSidebar(): void {
    this.sidebarCollapsedState.update((value) => !value);
  }

  setSidebarCollapsed(collapsed: boolean): void {
    this.sidebarCollapsedState.set(collapsed);
  }

  toggleTheme(): void {
    this.themeState.update((value) => (value === 'dark' ? 'default' : 'dark'));
    void this.loadTheme(false);
  }

  setTheme(theme: ThemeMode): void {
    this.themeState.set(theme === 'dark' ? 'dark' : 'default');
    void this.loadTheme(false);
  }

  initTheme(): Promise<void> {
    return this.loadTheme(true);
  }

  private reverseTheme(theme: ThemeType): ThemeType {
    return theme === 'dark' ? 'default' : 'dark';
  }

  private loadCss(href: string, id: ThemeType): Promise<void> {
    const existed = this.document.getElementById(id) as HTMLLinkElement | null;
    if (existed) {
      const targetHref = new URL(href, this.document.baseURI).toString();
      if (existed.href !== targetHref) {
        existed.href = targetHref;
      }
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      const style = this.document.createElement('link');
      style.rel = 'stylesheet';
      style.href = href;
      style.id = id;
      style.onload = () => resolve();
      style.onerror = () => reject(new Error(`[hub-v2] failed to load theme: ${href}`));
      this.document.head.append(style);
    });
  }

  private removeUnusedTheme(theme: ThemeType): void {
    this.document.documentElement.classList.remove(theme);
    const oldStyle = this.document.getElementById(theme);
    if (oldStyle) {
      this.document.head.removeChild(oldStyle);
    }
  }

  private applyThemeAttrs(theme: ThemeType): void {
    const mode: ThemeMode = theme === 'dark' ? 'dark' : 'light';
    this.document.documentElement.classList.add(theme);
    this.document.documentElement.dataset['theme'] = mode;
    if (this.document.body) {
      this.document.body.dataset['theme'] = mode;
    }
  }

  private async loadTheme(firstLoad: boolean): Promise<void> {
    const theme = this.themeState();
    if (firstLoad) {
      this.applyThemeAttrs(theme);
    }

    await this.loadCss(`${theme}.css`, theme);
    this.applyThemeAttrs(theme);
    this.removeUnusedTheme(this.reverseTheme(theme));
    this.document.defaultView?.localStorage.setItem(THEME_STORAGE_KEY, theme === 'dark' ? 'dark' : 'light');
  }
}
