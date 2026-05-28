import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PanelCardComponent } from '@shared/ui';
import type { KeyRdItem } from '../models/delivery-overview.model';

@Component({
  selector: 'app-delivery-overview-key-items-panel',
  standalone: true,
  imports: [PanelCardComponent, RouterLink],
  template: `
    <app-panel-card title="关键研发项进度" [empty]="items().length === 0" emptyText="当前项目暂无研发项数据">
      <!-- <a panel-actions class="panel-link" [routerLink]="['/rd']">打开 RD 明细</a> -->
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>研发项</th>
              <th>负责人</th>
              <th>阶段</th>
              <th>进度</th>
              <th>计划完成</th>
              <th>健康状态</th>
              <th>进展说明</th>
              <th data-export-hidden>明细</th>
            </tr>
          </thead>
          <tbody>
            @for (row of items(); track row.item.id) {
              <tr>
                <td>
                  <div class="rd-no">{{ row.item.rdNo }}</div>
                  <div class="rd-title">{{ row.item.title }}</div>
                  <div class="rd-sub">{{ typeLabel(row.item.type) }} · 更新 {{ formatDateTime(row.item.updatedAt) }}</div>
                </td>
                <td>{{ row.item.assigneeName || '未指定' }}</td>
                <td>{{ row.stageName }}</td>
                <td>
                  <div class="progress-line">
                    <div class="bar"><span [style.width.%]="normalizeProgress(row.item.progress)"></span></div>
                    <strong>{{ normalizeProgress(row.item.progress) }}%</strong>
                  </div>
                </td>
                <td>{{ formatDate(row.item.planEndAt) }}</td>
                <td><span class="health" [attr.data-tone]="row.healthTone">{{ row.healthLabel }}</span></td>
                <td><span class="report-note">{{ row.reportNote }}</span></td>
                <td data-export-hidden><a class="table-link" [routerLink]="['/rd', row.item.id]">查看</a></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </app-panel-card>
  `,
  styles: [
    `
      .panel-link,
      .table-link {
        color: var(--primary-600);
        font-weight: 600;
      }
      .table-wrap {
        overflow-x: auto;
      }
      table {
        width: 100%;
        min-width: 980px;
        border-collapse: separate;
        border-spacing: 0;
      }
      th,
      td {
        padding: 13px 14px;
        border-bottom: 1px solid var(--border-color-soft);
        text-align: left;
        vertical-align: middle;
        font-size: 13px;
      }
      th {
        background: var(--bg-subtle);
        color: var(--text-muted);
        font-size: 12px;
        font-weight: 700;
        white-space: nowrap;
      }
      .rd-no {
        color: var(--text-disabled);
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 12px;
      }
      .rd-title {
        margin-top: 3px;
        color: var(--text-heading);
        font-weight: 700;
      }
      .rd-sub {
        margin-top: 4px;
        color: var(--text-muted);
        font-size: 12px;
      }
      .progress-line {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 130px;
      }
      .bar {
        flex: 1;
        height: 7px;
        border-radius: 999px;
        background: var(--border-color);
        overflow: hidden;
      }
      .bar span {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, var(--primary-600), #0ea5e9);
      }
      .health {
        display: inline-flex;
        align-items: center;
        min-height: 24px;
        padding: 0 8px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 700;
        white-space: nowrap;
        background: var(--bg-subtle);
        color: var(--text-muted);
      }
      .health[data-tone='green'] {
        background: var(--color-success-light);
        color: var(--color-success);
      }
      .health[data-tone='orange'] {
        background: var(--color-warning-light);
        color: var(--color-warning);
      }
      .health[data-tone='red'] {
        background: var(--color-danger-light);
        color: var(--color-danger);
      }
      .report-note {
        display: block;
        max-width: 220px;
        color: var(--text-muted);
        line-height: 1.45;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeliveryOverviewKeyItemsPanelComponent {
  readonly items = input.required<KeyRdItem[]>();

  normalizeProgress(progress: number | null | undefined): number {
    const value = Number(progress ?? 0);
    return Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value))) : 0;
  }

  formatDate(value: string | null | undefined): string {
    const date = this.parseDate(value);
    return date ? `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : '-';
  }

  formatDateTime(value: string | null | undefined): string {
    const date = this.parseDate(value);
    if (!date) return '-';
    return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  typeLabel(type: string): string {
    const labels: Record<string, string> = {
      feature_dev: '功能开发',
      tech_refactor: '技术改造',
      integration: '联调协作',
      env_setup: '环境准备',
      requirement_confirmation: '需求确认',
      bug_fix: 'BUG修复',
      solution_design: '方案设计',
      testing_validation: '测试验证',
      delivery_launch: '交付上线',
      project_closure: '项目结项',
    };
    return labels[type] ?? type;
  }

  private parseDate(value: string | null | undefined): Date | null {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
}
