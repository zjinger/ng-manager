import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';

@Component({
  selector: 'app-admin-placeholder-page',
  imports: [RouterLink, NzButtonModule, NzIconModule],
  template: `
    <section class="admin-placeholder">
      <div class="admin-placeholder__icon">
        <span nz-icon [nzType]="icon()"></span>
      </div>
      <h1>{{ title() }}</h1>
      <p>
        该入口已按新版后台导航预留。第一版仅接入已有用户、组织、财务角色和项目管理能力，
        {{ title() }} 暂不保存任何配置变更。
      </p>
      <div class="admin-placeholder__actions">
        <button nz-button nzType="primary" [routerLink]="['/admin']">
          <span nz-icon nzType="dashboard"></span>
          返回仪表盘
        </button>
        <button nz-button [routerLink]="['/admin/departments']">
          <span nz-icon nzType="cluster"></span>
          查看组织管理
        </button>
      </div>
    </section>
  `,
  styles: [
    `
      .admin-placeholder {
        min-height: 420px;
        display: grid;
        place-items: center;
        align-content: center;
        gap: 14px;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        background: var(--bg-container);
        padding: 48px 24px;
        text-align: center;
      }
      .admin-placeholder__icon {
        width: 56px;
        height: 56px;
        display: grid;
        place-items: center;
        border-radius: 16px;
        background: var(--color-primary-light);
        color: var(--color-primary);
        font-size: 24px;
      }
      h1 {
        margin: 0;
        color: var(--text-heading);
        font-size: 22px;
        font-weight: 800;
      }
      p {
        max-width: 620px;
        margin: 0;
        color: var(--text-muted);
        line-height: 1.7;
      }
      .admin-placeholder__actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        justify-content: center;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPlaceholderPageComponent {
  private readonly route = inject(ActivatedRoute);

  readonly title = computed(() => this.route.snapshot.data['title'] || '后台功能');
  readonly icon = computed(() => this.route.snapshot.data['icon'] || 'appstore');
}
