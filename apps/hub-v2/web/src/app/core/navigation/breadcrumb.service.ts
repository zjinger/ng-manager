import { Injectable } from '@angular/core';

export interface BreadcrumbItem {
  label: string;
  route?: string;
}

@Injectable({ providedIn: 'root' })
export class BreadcrumbService {
  getCurrentLabel(url: string): string {
    const items = this.getBreadcrumbs(url);
    return items.at(-1)?.label ?? '工作台';
  }

  getBreadcrumbs(url: string): BreadcrumbItem[] {
    const path = url.split('?')[0].split('#')[0];

    if (path === '/' || path === '/dashboard') {
      return [{ label: 'Dashboard' }];
    }

    if (path === '/dashboard/board') {
      return [{ label: '数据看板' }];
    }

    if (path.startsWith('/issues/')) {
      return [
        { label: '测试跟踪', route: '/issues' },
        { label: '测试单详情' },
      ];
    }

    if (path.startsWith('/issues')) {
      return [{ label: '测试跟踪' }];
    }

    if (path.startsWith('/rd/')) {
      return [
        { label: '研发管理', route: '/rd' },
        { label: '研发单详情' }
      ];
    }

    if (path.startsWith('/rd')) {
      return [{ label: '研发管理' }];
    }

    if (path.startsWith('/content')) {
      return [{ label: '内容管理' }];
    }

    if (path.startsWith('/reports')) {
      return [{ label: '积木报表' }];
    }

    if (path.startsWith('/feedbacks')) {
      return [{ label: '系统反馈' }];
    }

    if (path.startsWith('/projects')) {
      return [{ label: '项目管理' }];
    }

    if (path.startsWith('/users')) {
      return [{ label: '用户管理' }];
    }

    if (path.startsWith('/shared-config')) {
      return [{ label: '共享配置' }];
    }

    if (path.startsWith('/profile')) {
      return [{ label: '个人中心' }];
    }

    return [{ label: '工作台' }];
  }
}
