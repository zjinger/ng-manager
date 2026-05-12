import { ScrollingModule } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import type {
  TaskAnalyzeDiagnosticDto,
  TaskAnalyzeReportSummaryDto,
  TaskAnalyzeResultDto,
  TaskAssetInfoDto,
} from '@yinuo-ngm/protocol';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import type { InsightGroup, TreemapCell } from '../task-analysis.types';
import { TaskAnalysisDiagnosticsComponent } from './task-analysis-diagnostics.component';

@Component({
  selector: 'app-task-analysis-report',
  standalone: true,
  imports: [
    CommonModule,
    NzProgressModule,
    NzTagModule,
    NzIconModule,
    NzTooltipModule,
    ScrollingModule,
    TaskAnalysisDiagnosticsComponent,
  ],
  template: `
    <div class="summary-grid">
      <div class="metric" [class.metric-good]="sizeLevelFn(report.summary.totalRawSize) === 'good'" [class.metric-warn]="sizeLevelFn(report.summary.totalRawSize) === 'warning'" [class.metric-danger]="sizeLevelFn(report.summary.totalRawSize) === 'danger'">
        <div class="metric-icon">
          <nz-icon nzType="database" />
        </div>
        <div class="metric-body">
          <span>总体积</span>
          <strong>{{ formatSizeFn(report.summary.totalRawSize) }}</strong>
        </div>
      </div>
      <div class="metric accent-blue">
        <div class="metric-icon" style="color: #1677ff">
          <nz-icon nzType="code" />
        </div>
        <div class="metric-body">
          <span>JS</span>
          <strong>{{ formatSizeFn(report.summary.jsRawSize) }}</strong>
          <div class="metric-tag">{{ report.summary.jsFileCount || 0 }} 个文件</div>
        </div>
      </div>
      <div class="metric accent-green">
        <div class="metric-icon" style="color: #52c41a">
          <nz-icon nzType="bg-colors" />
        </div>
        <div class="metric-body">
          <span>CSS</span>
          <strong>{{ formatSizeFn(report.summary.cssRawSize) }}</strong>
          <div class="metric-tag">{{ report.summary.cssFileCount || 0 }} 个文件</div>
        </div>
      </div>
      <div class="metric metric-default">
        <div class="metric-icon compress">
          <nz-icon nzType="compress" />
        </div>
        <div class="metric-body">
          <span>Gzip</span>
          <strong>{{ formatSizeFn(report.summary.totalGzipSize) }}</strong>
          <div class="metric-tag">节省 {{ gzipSavingsPercent }}</div>
        </div>
      </div>
      @if ((report.summary.totalBrotliSize || 0) > 0) {
      <div class="metric metric-default">
        <div class="metric-icon compress">
          <nz-icon nzType="compress" />
        </div>
        <div class="metric-body">
          <span>Brotli</span>
          <strong>{{ formatSizeFn(report.summary.totalBrotliSize) }}</strong>
          <div class="metric-tag">节省 {{ brotliSavingsPercent }}</div>
        </div>
      </div>
      }
      <div class="metric metric-default">
        <div class="metric-icon">
          <nz-icon nzType="file" />
        </div>
        <div class="metric-body">
          <span>文件数</span>
          <strong>{{ report.summary.fileCount }}</strong>
        </div>
      </div>
    </div>

    @if (report.summary.totalRawSize) {
      <div class="size-bar-section">
        <div class="size-bar">
          <div class="size-bar-seg js" [style.flex]="report.summary.jsRawSize || 0">
            @if (((report.summary.jsRawSize || 0) / report.summary.totalRawSize * 100) > 8) {
              <span>JS {{ ((report.summary.jsRawSize || 0) / report.summary.totalRawSize * 100).toFixed(0) }}%</span>
            }
          </div>
          <div class="size-bar-seg css" [style.flex]="report.summary.cssRawSize || 0">
            @if (((report.summary.cssRawSize || 0) / report.summary.totalRawSize * 100) > 8) {
              <span>CSS {{ ((report.summary.cssRawSize || 0) / report.summary.totalRawSize * 100).toFixed(0) }}%</span>
            }
          </div>
          <div class="size-bar-seg asset" [style.flex]="report.summary.assetRawSize || 0">
            @if (((report.summary.assetRawSize || 0) / report.summary.totalRawSize * 100) > 8) {
              <span>资源 {{ ((report.summary.assetRawSize || 0) / report.summary.totalRawSize * 100).toFixed(0) }}%</span>
            }
          </div>
        </div>
      </div>
    }

    @if (insightGroups.length > 0) {
      <div class="section">
        <div class="section-title">
          <nz-icon nzType="bulb" />
          <span>构建提示</span>
        </div>
        <div class="insight-groups">
          @for (group of insightGroups; track group.category) {
          <div class="insight-group" [class]="'category-' + group.category">
            <div class="insight-group-title">
              <span>{{ group.label }}</span>
              <em>{{ group.items.length }}</em>
            </div>
            <div class="insight-list">
              @for (insight of group.items; track insight.code + ':' + insight.message) {
              <div class="insight" [class.warning]="insight.level === 'warning'" [class.info]="insight.level === 'info'">
                <div class="insight-icon">
                  @if (insight.level === 'warning') {
                    <nz-icon nzType="exclamation-circle" style="color: #fa8c16" />
                  } @else {
                    <nz-icon nzType="info-circle" style="color: #1677ff" />
                  }
                </div>
                <div class="insight-body">
                  <span>{{ insight.message }}</span>
                </div>
              </div>
              }
            </div>
          </div>
          }
        </div>
      </div>
    }

    <div class="section">
      <div class="section-title">
        <nz-icon nzType="line-chart" />
        <span>历史趋势</span>
        <span class="section-count">最近 {{ historyRows.length }} 次</span>
      </div>
      @if (historyRows.length > 0) {
      <div class="history-delta-grid">
        @for (item of historyDeltaItems; track item.label) {
        <div class="history-delta-card">
          <span>{{ item.label }}</span>
          <strong [class]="item.className">{{ item.value }}</strong>
        </div>
        }
      </div>
      <div class="history-table" role="table" aria-label="历史趋势">
        <div class="history-row history-head" role="row">
          <div role="columnheader">构建时间</div>
          <div role="columnheader">Raw Size</div>
          <div role="columnheader">Gzip Size</div>
          <div role="columnheader">Brotli Size</div>
          <div role="columnheader">JS Size</div>
          <div role="columnheader">CSS Size</div>
          <div role="columnheader">Duration</div>
        </div>
        @for (item of historyRows; track item.runId) {
        <div class="history-row" role="row" [class.current]="item.runId === report.runId">
          <div role="cell">{{ formatTimeFn(item.createdAt) }}</div>
          <div role="cell">{{ formatSizeFn(item.totalRawSize) }}</div>
          <div role="cell">{{ formatSizeFn(item.totalGzipSize) }}</div>
          <div role="cell">{{ item.totalBrotliSize ? formatSizeFn(item.totalBrotliSize) : '-' }}</div>
          <div role="cell">{{ formatSizeFn(item.jsRawSize) }}</div>
          <div role="cell">{{ formatSizeFn(item.cssRawSize) }}</div>
          <div role="cell">{{ formatMsFn(item.durationMs) }}</div>
        </div>
        }
      </div>
      } @else {
      <div class="hint">
        <nz-icon nzType="info-circle" />
        {{ historyError || '暂无历史构建记录。' }}
      </div>
      }
    </div>

    @if (treemapCells.length > 0) {
      <div class="section">
        <div class="section-title">
          <nz-icon nzType="appstore" />
          <span>体积分布 (Top {{ treemapCells.length }})</span>
        </div>
        <div class="treemap">
          @for (cell of treemapCells; track cell.relativePath) {
          <div
            class="treemap-cell"
            [style.flex]="cell.colSpan"
            [style.background]="cell.color"
            [nz-tooltip]="cell.relativePath + ' (' + formatSizeFn(cell.size) + ')'"
          >
            @if (cell.colSpan > 3) {
              <div class="treemap-name">{{ cell.name }}</div>
              <div class="treemap-size">{{ formatSizeFn(cell.size) }}</div>
            }
          </div>
          }
        </div>
        <div class="treemap-legend">
          <span class="legend-item"><span class="dot" style="background: #1677ff"></span>JS</span>
          <span class="legend-item"><span class="dot" style="background: #52c41a"></span>CSS</span>
          <span class="legend-item"><span class="dot" style="background: #722ed1"></span>HTML</span>
          <span class="legend-item"><span class="dot" style="background: #fa8c16"></span>图片</span>
          <span class="legend-item"><span class="dot" style="background: #13c2c2"></span>字体</span>
          <span class="legend-item"><span class="dot" style="background: #8c8c8c"></span>其他</span>
        </div>
      </div>
    }

    <div class="section">
      <div class="section-title">
        <nz-icon nzType="ordered-list" />
        <span>最大文件</span>
      </div>
      <div class="top-list">
        @for (asset of topAssets; track asset.relativePath) {
        <div class="top-row">
          <div class="top-name">
            <nz-tag [nzColor]="getTypeColorFn(asset.type)">
              <nz-icon [nzType]="getTypeIconFn(asset.type)" />
              {{ asset.type }}
            </nz-tag>
            <span [title]="asset.relativePath">{{ asset.relativePath }}</span>
          </div>
          <div class="top-size" [class]="'size-' + sizeLevelFn(asset.rawSize)">{{ formatSizeFn(asset.rawSize) }}</div>
          <nz-progress [nzPercent]="(asset.ratio || 0) * 100" [nzShowInfo]="false" [nzStrokeColor]="getTypeColorFn(asset.type)"></nz-progress>
        </div>
        }
      </div>
    </div>

    @if (report.stats) {
      <div class="section stats-section">
        <div class="section-title">
          <nz-icon nzType="deployment-unit" />
          <span>Stats 分析</span>
        </div>
        <div class="stats-meta">
          <nz-tag>{{ report.stats.format }}</nz-tag>
          <span class="stats-path">{{ report.stats.statsPath }}</span>
        </div>

        <div class="stats-grid">
          <div class="stats-card">
            <div class="stats-card-title">
              <nz-icon nzType="block" />
              Chunk Top
            </div>
            @for (chunk of statsChunks; track chunk.name) {
            <div class="stats-row">
              <div class="stats-row-name">
                <span [title]="chunk.name">{{ chunk.name }}</span>
                @if (chunk.initial) {
                  <nz-tag nzColor="blue" class="mini-tag">initial</nz-tag>
                }
                @if (chunk.entry) {
                  <nz-tag nzColor="purple" class="mini-tag">entry</nz-tag>
                }
              </div>
              <strong>{{ formatSizeFn(chunk.rawSize) }}</strong>
            </div>
            }
          </div>
          <div class="stats-card">
            <div class="stats-card-title">
              <nz-icon nzType="apartment" />
              依赖 Top
            </div>
            @for (dep of statsDependencies; track dep.name) {
            <div class="stats-row">
              <span [title]="dep.name">{{ dep.name }}</span>
              <strong>{{ formatSizeFn(dep.rawSize) }}</strong>
            </div>
            }
          </div>
          <div class="stats-card">
            <div class="stats-card-title">
              <nz-icon nzType="node-index" />
              模块 Top
            </div>
            @for (mod of statsModules; track trackByModPathFn($index, mod)) {
            <div class="stats-row">
              <span [title]="mod.packageName || mod.name">{{ mod.packageName || mod.name }}</span>
              <strong>{{ formatSizeFn(mod.rawSize) }}</strong>
            </div>
            }
          </div>
        </div>
      </div>
    }

    <div class="section table-section">
      <div class="section-title">
        <nz-icon nzType="table" />
        <span>文件明细</span>
        <span class="section-count">{{ assets.length }} 个文件</span>
      </div>
      <div class="asset-table" role="table" aria-label="文件明细">
        <div class="asset-row asset-head" role="row">
          <div role="columnheader">文件名</div>
          <div role="columnheader">类型</div>
          <div role="columnheader">Raw Size</div>
          <div role="columnheader">Gzip Size</div>
          <div role="columnheader">占比</div>
          <div role="columnheader">路径</div>
        </div>
        @if (useVirtualAssetTable) {
          <cdk-virtual-scroll-viewport
            class="asset-body"
            [itemSize]="40"
            [minBufferPx]="400"
            [maxBufferPx]="800"
            [style.height.px]="assetViewportHeight"
          >
            <div
              class="asset-row"
              role="row"
              *cdkVirtualFor="let asset of assets; trackBy: trackByAssetPathFn"
            >
              <div class="asset-name" role="cell" [title]="asset.name">{{ asset.name }}</div>
              <div role="cell">
                <nz-tag [nzColor]="getTypeColorFn(asset.type)">
                  <nz-icon [nzType]="getTypeIconFn(asset.type)" />
                  {{ asset.type }}
                </nz-tag>
              </div>
              <div role="cell" class="asset-size" [class]="'size-' + sizeLevelFn(asset.rawSize)">{{ formatSizeFn(asset.rawSize) }}</div>
              <div role="cell" class="asset-size">{{ formatSizeFn(asset.gzipSize) }}</div>
              <div role="cell" class="asset-size">{{ formatRatioFn(asset.ratio) }}</div>
              <div role="cell" class="asset-path" [title]="asset.relativePath">{{ asset.relativePath }}</div>
            </div>
          </cdk-virtual-scroll-viewport>
        } @else {
          <div class="asset-body asset-body-plain">
            @for (asset of assets; track asset.relativePath) {
            <div class="asset-row" role="row">
              <div class="asset-name" role="cell" [title]="asset.name">{{ asset.name }}</div>
              <div role="cell">
                <nz-tag [nzColor]="getTypeColorFn(asset.type)">
                  <nz-icon [nzType]="getTypeIconFn(asset.type)" />
                  {{ asset.type }}
                </nz-tag>
              </div>
              <div role="cell" class="asset-size" [class]="'size-' + sizeLevelFn(asset.rawSize)">{{ formatSizeFn(asset.rawSize) }}</div>
              <div role="cell" class="asset-size">{{ formatSizeFn(asset.gzipSize) }}</div>
              <div role="cell" class="asset-size">{{ formatRatioFn(asset.ratio) }}</div>
              <div role="cell" class="asset-path" [title]="asset.relativePath">{{ asset.relativePath }}</div>
            </div>
            }
          </div>
        }
      </div>
    </div>

    <app-task-analysis-diagnostics [items]="diagnosticInsights"></app-task-analysis-diagnostics>
  `,
  styleUrls: ['./task-analysis-report.component.less'],
})
export class TaskAnalysisReportComponent {
  @Input({ required: true }) report!: TaskAnalyzeResultDto;
  @Input() topAssets: TaskAssetInfoDto[] = [];
  @Input() assets: TaskAssetInfoDto[] = [];
  @Input() insightGroups: InsightGroup[] = [];
  @Input() historyRows: TaskAnalyzeReportSummaryDto[] = [];
  @Input() historyDeltaItems: Array<{ label: string; value: string; className: string }> = [];
  @Input() historyError = '';
  @Input() treemapCells: TreemapCell[] = [];
  @Input() statsChunks: Array<{ name: string; rawSize: number; initial?: boolean; entry?: boolean }> = [];
  @Input() statsDependencies: Array<{ name: string; rawSize: number }> = [];
  @Input() statsModules: Array<{ name: string; packageName?: string; path?: string; rawSize: number }> = [];
  @Input() useVirtualAssetTable = false;
  @Input() assetViewportHeight = 80;
  @Input() diagnosticInsights: TaskAnalyzeDiagnosticDto[] = [];

  @Input({ required: true }) formatSizeFn!: (size?: number) => string;
  @Input({ required: true }) formatRatioFn!: (value?: number) => string;
  @Input({ required: true }) formatTimeFn!: (value?: number) => string;
  @Input({ required: true }) formatMsFn!: (value?: number) => string;
  @Input({ required: true }) sizeLevelFn!: (size?: number) => string;
  @Input({ required: true }) getTypeColorFn!: (type: string) => string;
  @Input({ required: true }) getTypeIconFn!: (type: string) => string;
  @Input({ required: true }) trackByModPathFn!: (index: number, item: { path?: string; name: string }) => string;
  @Input({ required: true }) trackByAssetPathFn!: (index: number, item: TaskAssetInfoDto) => string;

  get gzipSavingsPercent(): string {
    const s = this.report?.summary;
    if (!s?.totalRawSize || !s?.totalGzipSize) return '0%';
    const savings = ((s.totalRawSize - s.totalGzipSize) / s.totalRawSize) * 100;
    return `${savings.toFixed(1)}%`;
  }

  get brotliSavingsPercent(): string {
    const s = this.report?.summary;
    if (!s?.totalRawSize || !s?.totalBrotliSize) return '0%';
    const savings = ((s.totalRawSize - s.totalBrotliSize) / s.totalRawSize) * 100;
    return `${savings.toFixed(1)}%`;
  }
}
