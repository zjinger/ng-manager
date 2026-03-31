import { inject, Injectable, signal } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { MenuItem } from './menu.model';

@Injectable({ providedIn: 'root' })
export class MenuService {
  currentMenu = signal<MenuItem | null>(null);

  private router = inject(Router);

  private menus: MenuItem[] = [
    { title: '仪表盘', path: '/dashboard', icon: 'dashboard', level: 1 },
    { title: '依赖', path: '/dependencies', icon: 'codepen', level: 1 },
    { title: '任务', path: '/tasks', icon: 'schedule', level: 1, taskCountBadge: true },
    { title: '配置', path: '/configuration', icon: 'setting', level: 1 },
    { title: 'API', path: '/rquest', icon: 'api', level: 1 },
    { title: '雪碧图', path: '/sprite', icon: 'smile', level: 1 },
    { title: '研发项', path: '/rd', icon: 'rocket', level: 1 },
    { title: '测试管理', path: '/issues', icon: 'bug', level: 1 },
    // { title: '系统设置', path: '/settings', icon: 'setting', level: 1 },
  ];

  constructor() {
    // 初始化时也同步一次
    this.syncByUrl(this.router.url);
    // 路由变化时同步
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.syncByUrl(e.urlAfterRedirects));
  }

  isActive(path: string) {
    // 子路由也算 active（/projects/1 命中 /projects）
    return this.router.isActive(path, {
      paths: 'subset',
      queryParams: 'ignored',
      fragment: 'ignored',
      matrixParams: 'ignored',
    });
  }

  getMenus(): MenuItem[] {
    return this.menus;
  }

  clickMenu(item: MenuItem) {
    if (item.path) this.router.navigateByUrl(item.path);
    // 这里可以不 set，让路由事件来驱动；也可以保留，体验更“即时”
    this.currentMenu.set(item);
  }

  private syncByUrl(url: string) {
    const path = this.normalizeUrl(url);
    const matched = this.findBestMatch(this.menus, path);
    this.currentMenu.set(matched);
  }

  private normalizeUrl(url: string) {
    // 去掉 query/hash
    return url.split('?')[0].split('#')[0];
  }

  private findBestMatch(menus: MenuItem[], currentPath: string): MenuItem | null {
    // 递归扁平化后，找“最长前缀匹配”的 menu（支持 /projects/123 也命中 /projects）
    const all = this.flatten(menus).filter((m) => !!m.path);

    let best: MenuItem | null = null;
    for (const m of all) {
      const p = m.path!;
      if (currentPath === p || currentPath.startsWith(p + '/')) {
        if (!best || p.length > best.path!.length) best = m;
      }
    }
    return best;
  }

  private flatten(menus: MenuItem[]): MenuItem[] {
    const out: MenuItem[] = [];
    for (const m of menus) {
      out.push(m);
      if (m.children?.length) out.push(...this.flatten(m.children));
    }
    return out;
  }
}
