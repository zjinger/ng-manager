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
  templateUrl: './task-analysis-report.component.html',
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
}
