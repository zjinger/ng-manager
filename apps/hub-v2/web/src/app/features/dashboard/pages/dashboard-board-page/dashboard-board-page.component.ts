import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NzButtonModule } from 'ng-zorro-antd/button';

import { DashboardRefreshBusService } from '@core/realtime';
import { ProjectContextStore } from '@core/state';
import { DashboardPanelComponent, PageHeaderComponent, StatCardComponent } from '@shared/ui';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import type { DashboardBoardData, DashboardBoardRange } from '../../models/dashboard.model';
import { DashboardApiService } from '../../services/dashboard-api.service';
import {
  buildIssueDistributionOption,
  buildIssueTrendOption,
  buildRdDistributionOption,
  buildRdTrendOption,
  readDashboardChartColors,
} from './dashboard-board.charts';

type EChartsCoreModule = typeof import('echarts/core');
type EChartsInstance = import('echarts/core').ECharts;

@Component({
  selector: 'app-dashboard-board-page',
  standalone: true,
  imports: [NzButtonModule, PageHeaderComponent, StatCardComponent, DashboardPanelComponent, NzPopconfirmModule],
  template: `
    <app-page-header
      title="数据看板"
      subtitle="面向项目维度查看质量状态、研发推进和交付节奏。"
    />

    <div class="board-toolbar">
      <div class="range-switch">
        <button nz-button [nzType]="range() === '7d' ? 'primary' : 'default'" (click)="setRange('7d')">近 7 天</button>
        <button nz-button [nzType]="range() === '30d' ? 'primary' : 'default'" (click)="setRange('30d')">近 30 天</button>
        <button nz-button nzType="default" 
          nz-popconfirm
          nzPopconfirmTitle="确认导出 PNG 吗？"
          nzPopconfirmOkText="确定"
          nzPopconfirmCancelText="取消"
          (nzOnConfirm)="exportBoardPng()"
         >导出 PNG</button>
      </div>
      <div class="scope-label">当前项目：{{ currentProjectName() }}</div>
    </div>

    @if (loading()) {
      <div class="board-empty">
        <div class="board-empty__title">正在加载看板数据…</div>
      </div>
    } @else if (board(); as data) {
      <div class="overview-grid">
        <app-stat-card label="未关闭测试单" [value]="data.overview.openIssues" icon="bug" tone="blue" />
        <app-stat-card label="待验证测试单" [value]="data.overview.pendingVerifyIssues" icon="check-circle" tone="purple" />
        <app-stat-card label="进行中研发项" [value]="data.overview.inProgressRdItems" icon="rocket" tone="green" />
        <app-stat-card label="近 7 天发布数" [value]="data.overview.recentReleaseCount" icon="notification" tone="orange" />
        <app-stat-card label="未处理反馈数" [value]="data.overview.unprocessedFeedbackCount" icon="message" tone="cyan" />
      </div>

      <div class="chart-grid">
        <app-dashboard-panel title="测试单新增/关闭趋势" icon="line-chart" [count]="data.trend.labels.length">
          <div class="chart-host" #issueTrendChart></div>
        </app-dashboard-panel>

        <app-dashboard-panel title="研发项完成趋势" icon="area-chart" [count]="data.trend.labels.length">
          <div class="chart-host" #rdTrendChart></div>
        </app-dashboard-panel>

        <app-dashboard-panel title="测试单分布" icon="fund-projection-screen" [count]="distributionTotal(data.distribution.issueByStatus)">
          <div class="chart-host" #issueDistributionChart></div>
        </app-dashboard-panel>

        <app-dashboard-panel title="研发项分布" icon="apartment" [count]="distributionTotal(data.distribution.rdByStatus)">
          <div class="chart-host" #rdDistributionChart></div>
        </app-dashboard-panel>
      </div>
    } @else {
      <div class="board-empty">
        <div class="board-empty__title">暂无看板数据</div>
      </div>
    }
  `,
  styles: [
    `
      .board-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 16px;
      }
      .range-switch {
        display: inline-flex;
        gap: 8px;
      }
      .scope-label {
        color: var(--text-muted);
        font-size: 13px;
      }
      .overview-grid {
        display: grid;
        gap: 14px;
        grid-template-columns: repeat(5, minmax(0, 1fr));
      }
      .chart-grid {
        margin-top: 16px;
        display: grid;
        gap: 16px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .chart-host {
        width: 100%;
        height: 320px;
      }
      .board-empty {
        padding: 32px;
        border-radius: 16px;
        border: 1px dashed var(--border-color);
        background: var(--bg-container);
        box-shadow: var(--shadow-sm);
      }
      .board-empty__title {
        color: var(--text-primary);
        font-weight: 600;
      }
      @media (max-width: 1400px) {
        .overview-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
      }
      @media (max-width: 1200px) {
        .chart-grid {
          grid-template-columns: 1fr;
        }
      }
      @media (max-width: 900px) {
        .overview-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .board-toolbar {
          align-items: flex-start;
          flex-direction: column;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardBoardPageComponent implements AfterViewInit {
  @ViewChild('issueTrendChart') private issueTrendChartRef?: ElementRef<HTMLDivElement>;
  @ViewChild('rdTrendChart') private rdTrendChartRef?: ElementRef<HTMLDivElement>;
  @ViewChild('issueDistributionChart') private issueDistributionChartRef?: ElementRef<HTMLDivElement>;
  @ViewChild('rdDistributionChart') private rdDistributionChartRef?: ElementRef<HTMLDivElement>;

  private readonly api = inject(DashboardApiService);
  private readonly projectContext = inject(ProjectContextStore);
  private readonly dashboardRefreshBus = inject(DashboardRefreshBusService);
  private readonly destroyRef = inject(DestroyRef);

  readonly range = signal<DashboardBoardRange>('7d');
  readonly loading = signal(false);
  readonly board = signal<DashboardBoardData | null>(null);
  readonly currentProjectName = computed(() => this.projectContext.currentProject()?.name ?? '全部项目');

  private echartsCore: EChartsCoreModule | null = null;
  private issueTrendChart?: EChartsInstance;
  private rdTrendChart?: EChartsInstance;
  private issueDistributionChart?: EChartsInstance;
  private rdDistributionChart?: EChartsInstance;
  private themeObserver?: MutationObserver;
  private readonly chartGroupId = 'dashboard-board-group';

  constructor() {
    effect(() => {
      this.projectContext.currentProjectId();
      this.range();
      const hasBoardData = untracked(() => this.board() !== null);
      this.load(hasBoardData);
    });

    let skipFirst = true;
    effect(() => {
      const event = this.dashboardRefreshBus.event();
      if (skipFirst) {
        skipFirst = false;
        return;
      }
      const relevant = event.entityTypes.some((type) => ['issue', 'rd', 'release', 'feedback'].includes(type));
      if (!relevant) {
        return;
      }
      untracked(() => this.load(true));
    });

    effect(() => {
      const data = this.board();
      if (!data) {
        return;
      }
      queueMicrotask(() => {
        void this.renderAllCharts(data);
      });
    });
  }

  ngAfterViewInit(): void {
    void this.initCharts();
    this.observeThemeChange();
    const current = this.board();
    if (current) {
      void this.renderAllCharts(current);
    }
    window.addEventListener('resize', this.handleResize);
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('resize', this.handleResize);
      this.themeObserver?.disconnect();
      this.disposeCharts();
    });
  }

  setRange(value: DashboardBoardRange): void {
    this.range.set(value);
  }

  exportBoardPng(): void {
    if (!this.issueTrendChart) {
      return;
    }
    const dataUrl = this.issueTrendChart.getConnectedDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: readDashboardChartColors().background,
    });
    const project = (this.currentProjectName() || 'all').replace(/[\\/:*?"<>|]/g, '_');
    const filename = `dashboard-board-${project}-${this.range()}-${this.todayLabel()}.png`;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    link.click();
  }

  distributionTotal(list: Array<{ value: number }>): number {
    return list.reduce((sum, item) => sum + item.value, 0);
  }

  private load(silent = false): void {
    if (!silent) {
      this.loading.set(true);
    }
    this.api
      .getBoardData({
        projectId: this.projectContext.currentProjectId() || undefined,
        range: this.range(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.board.set(data);
          if (!silent) {
            this.loading.set(false);
          }
        },
        error: () => {
          this.board.set(null);
          if (!silent) {
            this.loading.set(false);
          }
        },
      });
  }

  private async ensureEchartsLoaded(): Promise<EChartsCoreModule> {
    if (this.echartsCore) {
      return this.echartsCore;
    }

    const [coreModule, chartsModule, componentsModule, renderersModule] = await Promise.all([
      import('echarts/core'),
      import('echarts/charts'),
      import('echarts/components'),
      import('echarts/renderers'),
    ]);

    coreModule.use([
      chartsModule.LineChart,
      chartsModule.BarChart,
      chartsModule.PieChart,
      componentsModule.GridComponent,
      componentsModule.TooltipComponent,
      componentsModule.LegendComponent,
      componentsModule.TitleComponent,
      componentsModule.GraphicComponent,
      renderersModule.CanvasRenderer,
    ]);

    this.echartsCore = coreModule;
    return coreModule;
  }

  private async initCharts(): Promise<void> {
    if (!this.issueTrendChartRef || !this.rdTrendChartRef || !this.issueDistributionChartRef || !this.rdDistributionChartRef) {
      return;
    }

    const echartsModule = await this.ensureEchartsLoaded();
    this.issueTrendChart = echartsModule.init(this.issueTrendChartRef.nativeElement);
    this.rdTrendChart = echartsModule.init(this.rdTrendChartRef.nativeElement);
    this.issueDistributionChart = echartsModule.init(this.issueDistributionChartRef.nativeElement);
    this.rdDistributionChart = echartsModule.init(this.rdDistributionChartRef.nativeElement);

    this.issueTrendChart.group = this.chartGroupId;
    this.rdTrendChart.group = this.chartGroupId;
    this.issueDistributionChart.group = this.chartGroupId;
    this.rdDistributionChart.group = this.chartGroupId;
    echartsModule.connect(this.chartGroupId);
  }

  private disposeCharts(): void {
    this.echartsCore?.disconnect(this.chartGroupId);
    this.issueTrendChart?.dispose();
    this.rdTrendChart?.dispose();
    this.issueDistributionChart?.dispose();
    this.rdDistributionChart?.dispose();
  }

  private async renderAllCharts(data: DashboardBoardData): Promise<void> {
    if (!this.issueTrendChart || !this.rdTrendChart || !this.issueDistributionChart || !this.rdDistributionChart) {
      await this.initCharts();
    }
    if (!this.issueTrendChart || !this.rdTrendChart || !this.issueDistributionChart || !this.rdDistributionChart) {
      return;
    }

    const colors = readDashboardChartColors();
    this.issueTrendChart.setOption(buildIssueTrendOption(data, colors), true);
    this.rdTrendChart.setOption(buildRdTrendOption(data, colors), true);
    this.issueDistributionChart.setOption(buildIssueDistributionOption(data, colors), true);
    this.rdDistributionChart.setOption(buildRdDistributionOption(data, colors), true);
  }

  private observeThemeChange(): void {
    this.themeObserver = new MutationObserver(() => {
      const data = this.board();
      if (data) {
        void this.renderAllCharts(data);
      }
    });
    this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  private readonly handleResize = () => {
    this.issueTrendChart?.resize();
    this.rdTrendChart?.resize();
    this.issueDistributionChart?.resize();
    this.rdDistributionChart?.resize();
  };

  private todayLabel(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
