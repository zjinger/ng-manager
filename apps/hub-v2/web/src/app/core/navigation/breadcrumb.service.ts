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
    const [pathWithQuery] = url.split('#');
    const [path, query = ''] = pathWithQuery.split('?');
    const queryParams = new URLSearchParams(query);

    if (path === '/' || path === '/dashboard') {
      return [];
    }

    if (path === '/admin') {
      return [{ label: '仪表盘' }];
    }

    if (path.startsWith('/admin/users')) {
      return [{ label: '用户管理' }];
    }

    if (path.startsWith('/admin/departments')) {
      return [{ label: '部门组织' }];
    }

    if (path.startsWith('/admin/roles')) {
      return [{ label: '角色管理' }];
    }

    if (path.startsWith('/admin/permissions')) {
      return [{ label: '权限配置' }];
    }

    if (path.startsWith('/admin/audit')) {
      return [{ label: '审计日志' }];
    }

    if (path.startsWith('/admin/groups')) {
      return [{ label: '用户组' }];
    }

    if (path.startsWith('/admin/settings')) {
      return [{ label: '系统设置' }];
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

    if (path.startsWith('/rd/task-sheets/resources')) {
      return [
        { label: '研发管理', route: '/rd' },
        { label: '任务单配置' },
      ];
    }

    if (path.startsWith('/rd/task-sheets')) {
      return [
        { label: '研发管理', route: '/rd' },
        { label: '我的任务单' },
      ];
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
    if (path.startsWith('/reimbursements/new/travel')) {
      return [
        { label: '我的报销', route: '/reimbursements/mine' },
        { label: '新建差旅费报销' },
      ];
    }
    if (path.startsWith('/reimbursements/new/general')) {
      return [
        { label: '我的报销', route: '/reimbursements/mine' },
        { label: '新建费用报销' },
      ];
    }
    if (path.startsWith('/reimbursements/announcements')) {
      return [{ label: '公告管理' }];
    }
    if (path.startsWith('/reimbursements/mine')) {
      return [{ label: '我的报销' }];
    }
    if (path.endsWith('/edit') && path.startsWith('/reimbursements/')) {
      return [
        { label: '报销管理', route: '/reimbursements' },
        { label: '编辑报销单' },
      ];
    }
    if (path.startsWith('/reimbursements/')) {
      if (queryParams.get('source') === 'mine') {
        return [
          { label: '我的报销', route: '/reimbursements/mine' },
          { label: '报销单详情' },
        ];
      }
      return [
        { label: '报销管理', route: '/reimbursements' },
        { label: '报销单详情' },
      ];
    }
    if (path.startsWith('/reimbursements')) {
      return [{ label: '报销管理' }];
    }
    if (path.startsWith('/my-todos')) {
      return [{ label: '我的待办' }];
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
