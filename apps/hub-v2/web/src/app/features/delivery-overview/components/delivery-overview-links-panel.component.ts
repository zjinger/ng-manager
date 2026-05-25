import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NzIconModule } from 'ng-zorro-antd/icon';

import { PanelCardComponent } from '@shared/ui';

@Component({
  selector: 'app-delivery-overview-links-panel',
  standalone: true,
  imports: [NzIconModule, PanelCardComponent, RouterLink],
  template: `
    <app-panel-card title="明细入口">
      <div class="link-grid">
        <a [routerLink]="['/rd']"><span nz-icon nzType="rocket"></span><strong>RD 研发项</strong><small>查看任务拆解和阶段历史</small></a>
        <a [routerLink]="['/issues']"><span nz-icon nzType="bug"></span><strong>测试跟踪</strong><small>查看测试单和缺陷回归</small></a>
        <a [routerLink]="['/projects']"><span nz-icon nzType="appstore"></span><strong>项目管理</strong><small>查看项目成员和模块配置</small></a>
        <a [routerLink]="['/dashboard/board']"><span nz-icon nzType="line-chart"></span><strong>数据看板</strong><small>查看项目统计趋势</small></a>
      </div>
    </app-panel-card>
  `,
  styles: [
    `
      .link-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
        padding: 16px;
      }
      a {
        display: grid;
        gap: 8px;
        padding: 14px;
        border: 1px solid var(--border-color-soft);
        border-radius: var(--border-radius-sm);
        background: var(--bg-subtle);
        color: var(--text-secondary);
      }
      [nz-icon] {
        color: var(--primary-600);
      }
      small {
        color: var(--text-muted);
        line-height: 1.4;
      }
      @media (max-width: 900px) {
        .link-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeliveryOverviewLinksPanelComponent {}
