import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import type {
  TaskAnalyzeDiagnosticDto,
  TaskAnalyzeReportSummaryDto,
  TaskAnalyzeResultDto,
  TaskAssetInfoDto,
} from '@yinuo-ngm/protocol';
import type { InsightGroup, TreemapCell } from '../task-analysis.types';
import { TaskAnalysisAssetsComponent } from './task-analysis-assets.component';
import { TaskAnalysisDiagnosticsComponent } from './task-analysis-diagnostics.component';
import { TaskAnalysisHistoryComponent } from './task-analysis-history.component';
import { TaskAnalysisInsightsComponent } from './task-analysis-insights.component';
import { TaskAnalysisStatsComponent } from './task-analysis-stats.component';
import { TaskAnalysisSummaryComponent } from './task-analysis-summary.component';

@Component({
  selector: 'app-task-analysis-report',
  standalone: true,
  imports: [
    CommonModule,
    TaskAnalysisSummaryComponent,
    TaskAnalysisInsightsComponent,
    TaskAnalysisHistoryComponent,
    TaskAnalysisAssetsComponent,
    TaskAnalysisStatsComponent,
    TaskAnalysisDiagnosticsComponent,
  ],
  template: `
    <app-task-analysis-summary
      [report]="report"
      [formatSizeFn]="formatSizeFn"
      [sizeLevelFn]="sizeLevelFn"
    ></app-task-analysis-summary>

    <app-task-analysis-insights [insightGroups]="insightGroups"></app-task-analysis-insights>

    <app-task-analysis-stats
      [report]="report"
      [statsChunks]="statsChunks"
      [statsDependencies]="statsDependencies"
      [statsModules]="statsModules"
      [formatSizeFn]="formatSizeFn"
      [trackByModPathFn]="trackByModPathFn"
    ></app-task-analysis-stats>
    <app-task-analysis-assets
      [treemapCells]="treemapCells"
      [topAssets]="topAssets"
      [assets]="assets"
      [useVirtualAssetTable]="useVirtualAssetTable"
      [assetViewportHeight]="assetViewportHeight"
      [formatSizeFn]="formatSizeFn"
      [formatRatioFn]="formatRatioFn"
      [sizeLevelFn]="sizeLevelFn"
      [getTypeColorFn]="getTypeColorFn"
      [getTypeIconFn]="getTypeIconFn"
      [trackByAssetPathFn]="trackByAssetPathFn"
    ></app-task-analysis-assets>
    <app-task-analysis-history
      [currentRunId]="report.runId"
      [historyRows]="historyRows"
      [historyDeltaItems]="historyDeltaItems"
      [historyError]="historyError"
      [formatTimeFn]="formatTimeFn"
      [formatSizeFn]="formatSizeFn"
      [formatMsFn]="formatMsFn"
    ></app-task-analysis-history>
    <app-task-analysis-diagnostics [items]="diagnosticInsights"></app-task-analysis-diagnostics>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  @Input() statsChunks: Array<{
    name: string;
    rawSize: number;
    initial?: boolean;
    entry?: boolean;
  }> = [];
  @Input() statsDependencies: Array<{ name: string; rawSize: number }> = [];
  @Input() statsModules: Array<{
    name: string;
    packageName?: string;
    path?: string;
    rawSize: number;
  }> = [];
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
  @Input({ required: true }) trackByModPathFn!: (
    index: number,
    item: { path?: string; name: string },
  ) => string;
  @Input({ required: true }) trackByAssetPathFn!: (index: number, item: TaskAssetInfoDto) => string;
}
