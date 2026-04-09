import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewChild,
  effect,
  inject,
  input,
} from '@angular/core';
import type { EChartsOption } from 'echarts';

type EChartsInstance = import('echarts/core').ECharts;
type EChartsCoreModule = typeof import('echarts/core');

@Component({
  selector: 'app-echarts-chart',
  standalone: true,
  template: `
    <div class="echarts-host" [style.height]="height()" #host></div>
  `,
  styles: [
    `
      .echarts-host {
        width: 100%;
        min-height: 220px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EchartsChartComponent implements AfterViewInit {
  readonly option = input<EChartsOption | null>(null);
  readonly height = input('320px');

  @ViewChild('host') private hostRef?: ElementRef<HTMLDivElement>;

  private readonly destroyRef = inject(DestroyRef);
  private echartsCore: EChartsCoreModule | null = null;
  private chart?: EChartsInstance;
  private pendingOption: EChartsOption | null = null;
  private resizeObserver?: ResizeObserver;
  private resizeFrameId: number | null = null;

  constructor() {
    effect(() => {
      const option = this.option();
      this.pendingOption = option;
      if (!this.chart || !option) {
        return;
      }
      this.chart.setOption(option, true);
      this.scheduleResize();
    });
  }

  async ngAfterViewInit(): Promise<void> {
    await this.initChart();
    this.applyPendingOption();
    this.observeHostResize();
    window.addEventListener('resize', this.handleResize);
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('resize', this.handleResize);
      this.resizeObserver?.disconnect();
      if (this.resizeFrameId !== null) {
        cancelAnimationFrame(this.resizeFrameId);
        this.resizeFrameId = null;
      }
      this.chart?.dispose();
      this.chart = undefined;
    });
  }

  private async initChart(): Promise<void> {
    if (!this.hostRef || this.chart) {
      return;
    }
    const echarts = await this.ensureEchartsLoaded();
    this.chart = echarts.init(this.hostRef.nativeElement);
    this.scheduleResize();
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
      chartsModule.RadarChart,
      componentsModule.GridComponent,
      componentsModule.RadarComponent,
      componentsModule.TooltipComponent,
      componentsModule.LegendComponent,
      componentsModule.TitleComponent,
      renderersModule.CanvasRenderer,
    ]);

    this.echartsCore = coreModule;
    return coreModule;
  }

  private applyPendingOption(): void {
    if (!this.chart || !this.pendingOption) {
      return;
    }
    this.chart.setOption(this.pendingOption, true);
    this.scheduleResize();
  }

  private readonly handleResize = (): void => {
    this.scheduleResize();
  };

  private observeHostResize(): void {
    const host = this.hostRef?.nativeElement;
    if (!host || typeof ResizeObserver === 'undefined') {
      return;
    }
    this.resizeObserver?.disconnect();
    this.resizeObserver = new ResizeObserver(() => {
      this.scheduleResize();
    });
    this.resizeObserver.observe(host);
  }

  private scheduleResize(): void {
    if (!this.chart) {
      return;
    }
    if (this.resizeFrameId !== null) {
      cancelAnimationFrame(this.resizeFrameId);
    }
    this.resizeFrameId = requestAnimationFrame(() => {
      this.resizeFrameId = null;
      this.chart?.resize();
    });
  }
}
