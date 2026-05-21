import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';

import { AuthStore } from '@core/auth';
import { PageHeaderComponent, StatCardComponent } from '@shared/ui';
import { ProjectApiService } from '../../projects/services/project-api.service';
import { UserApiService } from '../../users/services/user-api.service';
import { OrganizationApiService } from '../../organization/services/organization-api.service';
import { SystemRbacApiService } from '../services/system-rbac-api.service';
import { AuditLogApiService } from '../services/audit-log-api.service';

type AdminStat = {
  label: string;
  value: number;
  sub: string;
  icon: string;
  tone: 'blue' | 'purple' | 'green' | 'orange' | 'cyan';
  permission?: string;
};

type AdminQuickLink = {
  label: string;
  description: string;
  route: string;
  icon: string;
  permissions: string[];
};

type AdminStatusItem = {
  title: string;
  description: string;
  tone: 'ok' | 'pending';
  permissions: string[];
};

@Component({
  selector: 'app-admin-dashboard-page',
  imports: [RouterLink, NzButtonModule, NzIconModule, PageHeaderComponent, StatCardComponent],
  template: `
    <app-page-header title="仪表盘" subtitle="集中查看账号、组织、权限与系统治理能力状态。">
      <!-- <button nz-button nzType="primary" [routerLink]="['/admin/users']">
        <span nz-icon nzType="user-add"></span>
        新建用户
      </button> -->
    </app-page-header>

    <section class="stats-row">
      @for (stat of stats(); track stat.label) {
        <app-stat-card
          [label]="stat.label"
          [value]="loading() ? '—' : stat.value"
          [hint]="stat.sub"
          [icon]="stat.icon"
          [tone]="stat.tone"
        />
      }
    </section>

    <section class="dashboard-grid">
      <article class="admin-card">
        <header>
          <h2><span nz-icon nzType="thunderbolt"></span> 快速入口</h2>
        </header>
        <div class="quick-grid">
          @for (link of quickLinks(); track link.route) {
            <a class="quick-link" [routerLink]="link.route">
              <span nz-icon [nzType]="link.icon"></span>
              <strong>{{ link.label }}</strong>
              <small>{{ link.description }}</small>
            </a>
          }
        </div>
      </article>

      <article class="admin-card">
        <header>
          <h2><span nz-icon nzType="info-circle"></span> 接入状态</h2>
        </header>
        <div class="status-list">
          @for (item of statusItems(); track item.title) {
            <div class="status-item">
              <span class="status-dot" [class.status-dot--ok]="item.tone === 'ok'" [class.status-dot--pending]="item.tone === 'pending'"></span>
              <div>
                <strong>{{ item.title }}</strong>
                <small>{{ item.description }}</small>
              </div>
            </div>
          }
        </div>
      </article>
    </section>
  `,
  styles: [
    `
      .stats-row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 16px;
        margin-bottom: 20px;
      }
      .admin-card {
        border: 1px solid var(--border-color);
        border-radius: 8px;
        background: var(--bg-container);
        box-shadow: var(--shadow-sm);
      }
      .dashboard-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.35fr) minmax(360px, 0.65fr);
        gap: 20px;
      }
      .admin-card header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-height: 52px;
        padding: 0 20px;
        border-bottom: 1px solid var(--border-color-soft);
      }
      .admin-card h2 {
        margin: 0;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: var(--text-heading);
        font-size: 15px;
        font-weight: 700;
      }
      .quick-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
        padding: 20px;
      }
      .quick-link {
        display: grid;
        gap: 6px;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        padding: 14px;
        color: var(--text-primary);
        text-decoration: none;
        min-height: 104px;
      }
      .quick-link:hover {
        border-color: var(--primary-300);
        background: var(--color-primary-light);
      }
      .quick-link > span {
        color: var(--color-primary);
        font-size: 18px;
      }
      .quick-link small,
      .status-item small {
        color: var(--text-muted);
      }
      .status-list {
        display: grid;
        gap: 0;
      }
      .status-item {
        display: flex;
        gap: 12px;
        padding: 16px 20px;
        border-bottom: 1px solid var(--border-color-soft);
      }
      .status-item:last-child {
        border-bottom: 0;
      }
      .status-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        margin-top: 5px;
      }
      .status-dot--ok { background: var(--color-success); }
      .status-dot--pending { background: var(--color-warning); }
      .status-item strong {
        display: block;
        color: var(--text-heading);
      }
      @media (max-width: 1100px) {
        .dashboard-grid {
          grid-template-columns: 1fr;
        }
        .quick-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      @media (max-width: 760px) {
        .quick-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardPageComponent {
  private readonly authStore = inject(AuthStore);
  private readonly userApi = inject(UserApiService);
  private readonly organizationApi = inject(OrganizationApiService);
  private readonly projectApi = inject(ProjectApiService);
  private readonly rbacApi = inject(SystemRbacApiService);
  private readonly auditLogApi = inject(AuditLogApiService);

  readonly loading = signal(true);
  readonly userTotal = signal(0);
  readonly activeUserTotal = signal(0);
  readonly departmentTotal = signal(0);
  readonly projectTotal = signal(0);
  readonly roleTotal = signal(0);
  readonly activeRoleTotal = signal(0);
  readonly permissionTotal = signal(0);
  readonly permissionDomainTotal = signal(0);
  readonly auditLogTotal = signal(0);

  readonly stats = computed<AdminStat[]>(() => {
    const items: AdminStat[] = [
      {
        label: '用户总数',
        value: this.userTotal(),
        sub: `${this.activeUserTotal()} 个活跃账号`,
        icon: 'team',
        tone: 'blue',
        permission: 'admin.users.manage',
      },
      {
        label: '部门数量',
        value: this.departmentTotal(),
        sub: '组织基础域已接入',
        icon: 'cluster',
        tone: 'green',
        permission: 'admin.departments.manage',
      },
      {
        label: '系统角色',
        value: this.roleTotal(),
        sub: `${this.activeRoleTotal()} 个启用角色`,
        icon: 'safety-certificate',
        tone: 'purple',
        permission: 'admin.roles.manage',
      },
      {
        label: '权限项',
        value: this.permissionTotal(),
        sub: `${this.permissionDomainTotal()} 个权限域`,
        icon: 'key',
        tone: 'cyan',
        permission: 'admin.roles.manage',
      },
      {
        label: '项目空间',
        value: this.projectTotal(),
        sub: '协作平台可访问项目',
        icon: 'appstore',
        tone: 'orange',
        permission: 'project.read.all',
      },
      {
        label: '审计日志',
        value: this.auditLogTotal(),
        sub: '后台治理操作留痕',
        icon: 'audit',
        tone: 'orange',
        permission: 'admin.audit.view',
      },
    ];
    return items.filter((item) => !item.permission || this.hasPermission(item.permission));
  });

  readonly quickLinks = computed<AdminQuickLink[]>(() => [
    { label: '用户管理', description: '账号、部门归属、登录状态', route: '/admin/users', icon: 'team', permissions: ['admin.users.manage'] },
    { label: '部门组织', description: '组织树、主管和部门角色', route: '/admin/departments', icon: 'cluster', permissions: ['admin.departments.manage'] },
    { label: '全局职务库', description: '用户职务和岗位标识', route: '/admin/titles', icon: 'idcard', permissions: ['admin.users.manage'] },
    { label: '角色管理', description: '系统角色、内置角色和用户绑定', route: '/admin/roles', icon: 'safety-certificate', permissions: ['admin.roles.manage'] },
    { label: '权限配置', description: '角色权限矩阵', route: '/admin/permissions', icon: 'key', permissions: ['admin.roles.manage'] },
    { label: '权限项管理', description: '权限编码、分组和启停状态', route: '/admin/permission-items', icon: 'unordered-list', permissions: ['admin.roles.manage'] },
    { label: '审计日志', description: '后台操作留痕和变更追踪', route: '/admin/audit', icon: 'audit', permissions: ['admin.audit.view'] },
    { label: '系统设置', description: '基础、安全、通知和集成配置', route: '/admin/settings', icon: 'setting', permissions: ['admin.settings.manage'] },
    { label: '项目管理', description: '进入协作平台项目空间', route: '/projects', icon: 'appstore', permissions: ['project.read.all', 'project.manage.all'] },
  ].filter((item) => this.hasAnyPermission(item.permissions)));

  readonly statusItems = computed<AdminStatusItem[]>(() => {
    const items: AdminStatusItem[] = [
      {
        title: '用户与组织基础域',
        description: '已接入用户、部门、职务、部门主管和用户状态管理。',
        tone: 'ok',
        permissions: ['admin.users.manage', 'admin.departments.manage'],
      },
      {
        title: 'RBAC 角色权限域',
        description: '已接入系统角色、权限矩阵、权限项和角色用户绑定。',
        tone: 'ok',
        permissions: ['admin.roles.manage'],
      },
      {
        title: '审计日志',
        description: '已接入后台治理操作留痕，支持模块、动作、级别和时间筛选。',
        tone: 'ok',
        permissions: ['admin.audit.view'],
      },
      {
        title: '系统设置',
        description: '已接入基础设置、安全策略、通知配置和集成配置。',
        tone: 'ok',
        permissions: ['admin.settings.manage'],
      },
      {
        title: '协作项目入口',
        description: '项目管理保留在协作平台侧，后台仪表盘仅提供跨域入口。',
        tone: 'ok',
        permissions: ['project.read.all', 'project.manage.all'],
      },
    ];
    return items.filter((item) => this.hasAnyPermission(item.permissions));
  });

  constructor() {
    forkJoin({
      users: this.hasPermission('admin.users.manage')
        ? this.userApi.list({ page: 1, pageSize: 1 }).pipe(catchError(() => of(null)))
        : of(null),
      activeUsers: this.hasPermission('admin.users.manage')
        ? this.userApi.list({ page: 1, pageSize: 1, status: 'active' }).pipe(catchError(() => of(null)))
        : of(null),
      departments: this.hasPermission('admin.departments.manage')
        ? this.organizationApi.listDepartments().pipe(catchError(() => of([])))
        : of([]),
      projects: this.hasAnyPermission(['project.read.all', 'project.manage.all'])
        ? this.projectApi.list({ page: 1, pageSize: 1 }).pipe(catchError(() => of(null)))
        : of(null),
      roles: this.hasPermission('admin.roles.manage')
        ? this.rbacApi.listRoles().pipe(catchError(() => of([])))
        : of([]),
      permissions: this.hasPermission('admin.roles.manage')
        ? this.rbacApi.listPermissions().pipe(catchError(() => of([])))
        : of([]),
      auditLogs: this.hasPermission('admin.audit.view')
        ? this.auditLogApi.list({ page: 1, pageSize: 1 }).pipe(catchError(() => of(null)))
        : of(null),
    }).subscribe({
      next: ({ users, activeUsers, departments, projects, roles, permissions, auditLogs }) => {
        this.userTotal.set(users?.total ?? 0);
        this.activeUserTotal.set(activeUsers?.total ?? 0);
        this.departmentTotal.set(departments.length);
        this.projectTotal.set(projects?.total ?? 0);
        this.roleTotal.set(roles.length);
        this.activeRoleTotal.set(roles.filter((role) => role.status === 'active').length);
        this.permissionTotal.set(permissions.length);
        this.permissionDomainTotal.set(new Set(permissions.map((permission) => permission.domainCode)).size);
        this.auditLogTotal.set(auditLogs?.total ?? 0);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private hasPermission(permission: string): boolean {
    return this.authStore.currentUser()?.permissionCodes.includes(permission) ?? false;
  }

  private hasAnyPermission(permissions: string[]): boolean {
    const current = this.authStore.currentUser()?.permissionCodes ?? [];
    return permissions.some((permission) => current.includes(permission));
  }
}
