import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';

import { PageHeaderComponent, StatCardComponent } from '@shared/ui';
import { ProjectApiService } from '../../projects/services/project-api.service';
import { UserApiService } from '../../users/services/user-api.service';
import { OrganizationApiService } from '../../organization/services/organization-api.service';

type AdminStat = {
  label: string;
  value: number;
  sub: string;
  icon: string;
  tone: 'blue' | 'purple' | 'green' | 'orange';
};

@Component({
  selector: 'app-admin-dashboard-page',
  imports: [RouterLink, NzButtonModule, NzIconModule, PageHeaderComponent, StatCardComponent],
  template: `
    <app-page-header title="仪表盘" subtitle="集中查看账号、组织和后台治理能力接入状态。">
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
          <a class="quick-link" [routerLink]="['/admin/users']">
            <span nz-icon nzType="team"></span>
            <strong>用户管理</strong>
            <small>账号、部门归属、登录状态</small>
          </a>
          <a class="quick-link" [routerLink]="['/admin/departments']">
            <span nz-icon nzType="cluster"></span>
            <strong>部门组织</strong>
            <small>组织树与财务角色</small>
          </a>
          <a class="quick-link" [routerLink]="['/projects']">
            <span nz-icon nzType="appstore"></span>
            <strong>项目管理</strong>
            <small>已移回 hub-v2 协作平台</small>
          </a>
          <a class="quick-link" [routerLink]="['/admin/permissions']">
            <span nz-icon nzType="key"></span>
            <strong>权限配置</strong>
            <small>后续接入权限矩阵</small>
          </a>
        </div>
      </article>

      <article class="admin-card">
        <header>
          <h2><span nz-icon nzType="info-circle"></span> 接入状态</h2>
        </header>
        <div class="status-list">
          <div class="status-item">
            <span class="status-dot status-dot--ok"></span>
            <div>
              <strong>用户与组织基础域</strong>
              <small>已接入真实用户、部门、财务角色能力</small>
            </div>
          </div>
          <div class="status-item">
            <span class="status-dot status-dot--ok"></span>
            <div>
              <strong>项目治理</strong>
              <small>已迁回普通平台侧入口</small>
            </div>
          </div>
          <div class="status-item">
            <span class="status-dot status-dot--pending"></span>
            <div>
              <strong>审计与权限矩阵</strong>
              <small>当前为占位入口，尚未扩展后端模型</small>
            </div>
          </div>
        </div>
      </article>
    </section>
  `,
  styles: [
    `
      .stats-row {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
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
        grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
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
        grid-template-columns: repeat(2, minmax(0, 1fr));
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
        .stats-row,
        .dashboard-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      @media (max-width: 760px) {
        .stats-row,
        .dashboard-grid,
        .quick-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardPageComponent {
  private readonly userApi = inject(UserApiService);
  private readonly organizationApi = inject(OrganizationApiService);
  private readonly projectApi = inject(ProjectApiService);

  readonly loading = signal(true);
  readonly userTotal = signal(0);
  readonly activeUserTotal = signal(0);
  readonly departmentTotal = signal(0);
  readonly projectTotal = signal(0);

  readonly stats = computed<AdminStat[]>(() => [
    {
      label: '用户总数',
      value: this.userTotal(),
      sub: `${this.activeUserTotal()} 个活跃账号`,
      icon: 'team',
      tone: 'blue',
    },
    {
      label: '部门数量',
      value: this.departmentTotal(),
      sub: '组织基础域已接入',
      icon: 'cluster',
      tone: 'green',
    },
    {
      label: '项目空间',
      value: this.projectTotal(),
      sub: '普通平台可直接访问',
      icon: 'appstore',
      tone: 'purple',
    },
    {
      label: '占位能力',
      value: 4,
      sub: '权限、审计、用户组、设置',
      icon: 'experiment',
      tone: 'orange',
    },
  ]);

  constructor() {
    forkJoin({
      users: this.userApi.list({ page: 1, pageSize: 1 }),
      activeUsers: this.userApi.list({ page: 1, pageSize: 1, status: 'active' }),
      departments: this.organizationApi.listDepartments(),
      projects: this.projectApi.list({ page: 1, pageSize: 1 }),
    }).subscribe({
      next: ({ users, activeUsers, departments, projects }) => {
        this.userTotal.set(users.total);
        this.activeUserTotal.set(activeUsers.total);
        this.departmentTotal.set(departments.length);
        this.projectTotal.set(projects.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
