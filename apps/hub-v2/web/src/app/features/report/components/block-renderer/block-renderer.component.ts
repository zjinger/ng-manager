import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { EChartsOption } from 'echarts';

import { EchartsChartComponent } from '@shared/ui';
import type { ReportBlock } from '../../models/report.model';

@Component({
  selector: 'app-report-block-renderer',
  standalone: true,
  imports: [EchartsChartComponent],
  template: `
    @if (!block()) {
      <section class="block block--empty">
        <span>暂无可展示的数据</span>
      </section>
    } @else if (block()!.type === 'empty') {
      <section class="block block--empty">
        <span>{{ block()!.title || '暂无数据' }}</span>
      </section>
    } @else if (block()!.type === 'stat_card') {
      <section class="block block--stat">
        <div class="block__title">{{ block()!.title }}</div>
        <div class="stat__value">{{ block()!.value ?? '-' }}</div>
        @if (block()!.subText || block()!.subValue) {
          <div class="stat__sub">{{ block()!.subText || '' }} {{ block()!.subValue || '' }}</div>
        }
      </section>
    } @else if (block()!.type === 'leaderboard') {
      <section class="block">
        <div class="block__title">{{ block()!.title || '排行榜' }}</div>
        <div class="leaderboard">
          @for (item of block()!.items || []; track item.rank) {
            <div class="leaderboard__row">
              <div class="leaderboard__rank">{{ item.rank }}</div>
              <div class="leaderboard__label">{{ item.label }}</div>
              <div class="leaderboard__value">{{ item.value }}</div>
              <div class="leaderboard__bar">
                <span [style.width.%]="item.percent ?? 0"></span>
              </div>
            </div>
          }
        </div>
      </section>
    } @else if (block()!.type === 'table') {
      <section class="block">
        <div class="block__title">{{ block()!.title || '数据列表' }}</div>
        <div class="table-wrap">
          <table class="result-table">
            <thead>
              <tr>
                @for (col of block()!.columns || []; track col.key) {
                  <th>{{ col.label }}</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (row of block()!.rows || []; track $index) {
                <tr>
                  @for (col of block()!.columns || []; track col.key) {
                    <td>{{ formatCell(row[col.key]) }}</td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    } @else {
      <section class="block">
        <div class="block__title">{{ block()!.title }}</div>
        @if (chartOption(); as option) {
          <app-echarts-chart [option]="option" [height]="chartHeight()" />
        }
      </section>
    }
  `,
  styles: [
    `
      .block {
        border: 1px solid var(--border-color);
        border-radius: 14px;
        background: var(--bg-container);
        padding: 16px;
      }
      .block--empty {
        min-height: 180px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--text-muted);
        background: var(--bg-subtle);
      }
      .block--stat {
        min-height: 220px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 12px;
      }
      .block__title {
        margin-bottom: 10px;
        color: var(--text-primary);
        font-size: 16px;
        font-weight: 600;
      }
      .stat__value {
        font-size: 44px;
        line-height: 1;
        font-weight: 700;
        color: var(--text-heading);
      }
      .stat__sub {
        color: var(--text-muted);
      }
      .leaderboard {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .leaderboard__row {
        display: grid;
        grid-template-columns: 34px minmax(0, 1fr) auto minmax(120px, 220px);
        align-items: center;
        gap: 12px;
      }
      .leaderboard__rank {
        width: 28px;
        height: 28px;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        color: var(--text-muted);
        background: var(--bg-subtle);
      }
      .leaderboard__label {
        color: var(--text-primary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .leaderboard__value {
        color: var(--text-secondary);
        font-variant-numeric: tabular-nums;
      }
      .leaderboard__bar {
        width: 100%;
        height: 8px;
        border-radius: 999px;
        background: var(--bg-subtle);
        overflow: hidden;
      }
      .leaderboard__bar span {
        display: block;
        height: 100%;
        border-radius: 999px;
        background: linear-gradient(90deg, var(--primary-500), color-mix(in srgb, var(--primary-500) 64%, #ffffff));
      }
      .table-wrap {
        overflow: auto;
      }
      .result-table {
        width: 100%;
        border-collapse: collapse;
      }
      .result-table th,
      .result-table td {
        padding: 10px 12px;
        text-align: left;
        border-bottom: 1px solid var(--border-color-soft);
        white-space: nowrap;
      }
      .result-table th {
        color: var(--text-muted);
        font-size: 12px;
        font-weight: 600;
      }
      .result-table td {
        color: var(--text-primary);
        font-size: 13px;
      }
      @media (max-width: 900px) {
        .leaderboard__row {
          grid-template-columns: 32px minmax(0, 1fr);
        }
        .leaderboard__value,
        .leaderboard__bar {
          grid-column: 2;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlockRendererComponent {
  readonly block = input<ReportBlock | null>(null);

  readonly chartHeight = computed(() => {
    const current = this.block();
    return current?.type === 'distribution_chart' ? '360px' : '340px';
  });

  readonly chartOption = computed<EChartsOption | null>(() => {
    const current = this.block();
    if (!current?.chart) {
      return null;
    }

    if (current.type === 'distribution_chart') {
      const source = current.chart.datasets[0]?.data ?? [];
      const data = current.chart.labels.map((label, index) => ({
        name: label,
        value: source[index] ?? 0,
      }));
      return {
        tooltip: { trigger: 'item' },
        legend: { bottom: 0, type: 'scroll' },
        series: [
          {
            type: 'pie',
            radius: current.chart.type === 'donut' ? ['44%', '70%'] : ['0%', '72%'],
            data,
          },
        ],
      };
    }

    const chartType = current.chart.type === 'bar' ? 'bar' : 'line';
    return {
      tooltip: { trigger: 'axis' },
      legend: { top: 0, type: 'scroll' },
      grid: { left: 12, right: 12, top: 36, bottom: 20, containLabel: true },
      xAxis: {
        type: 'category',
        data: current.chart.labels,
        boundaryGap: chartType === 'bar',
      },
      yAxis: { type: 'value' },
      series: current.chart.datasets.map((dataset) => ({
        name: dataset.label,
        type: chartType,
        smooth: chartType === 'line',
        data: dataset.data,
      })),
    };
  });

  protected formatCell(value: unknown): string {
    if (value === null || value === undefined) {
      return '-';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }
}

