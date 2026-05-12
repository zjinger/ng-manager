import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import type { TaskAnalyzeReportSummaryDto } from '@yinuo-ngm/protocol';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { FormatSizePipe, FormatTimePipe, FormatMsPipe } from '@app/shared';

@Component({
  selector: 'app-task-analysis-history',
  standalone: true,
  imports: [CommonModule, NzIconModule, FormatSizePipe, FormatTimePipe, FormatMsPipe],
  template: `
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
        <div class="history-row" role="row" [class.current]="item.runId === currentRunId">
          <div role="cell">{{ item.createdAt | formatTime }}</div>
          <div role="cell">{{ item.totalRawSize | formatSize }}</div>
          <div role="cell">{{ item.totalGzipSize | formatSize }}</div>
          <div role="cell">{{ item.totalBrotliSize ? (item.totalBrotliSize | formatSize) : '-' }}</div>
          <div role="cell">{{ item.jsRawSize | formatSize }}</div>
          <div role="cell">{{ item.cssRawSize | formatSize }}</div>
          <div role="cell">{{ item.durationMs | formatMs }}</div>
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
  `,
  styleUrls: ['./task-analysis-history.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskAnalysisHistoryComponent {
  @Input() currentRunId = '';
  @Input() historyRows: TaskAnalyzeReportSummaryDto[] = [];
  @Input() historyDeltaItems: Array<{ label: string; value: string; className: string }> = [];
  @Input() historyError = '';
}
