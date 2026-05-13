import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import type { TaskAnalyzeResultDto } from '@yinuo-ngm/protocol';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { FormatSizePipe } from '@app/shared';
import { getSizeLevel } from '@app/shared';

@Component({
  selector: 'app-task-analysis-summary',
  standalone: true,
  imports: [CommonModule, NzIconModule, FormatSizePipe],
  template: `
    <div class="summary-grid">
      <div class="metric" [class.metric-good]="sizeLevel(report.summary.totalRawSize) === 'good'" [class.metric-warn]="sizeLevel(report.summary.totalRawSize) === 'warning'" [class.metric-danger]="sizeLevel(report.summary.totalRawSize) === 'danger'">
        <div class="metric-icon">
          <nz-icon nzType="database" />
        </div>
        <div class="metric-body">
          <span>总体积</span>
          <strong>{{ report.summary.totalRawSize | formatSize }}</strong>
        </div>
      </div>
      <div class="metric accent-blue">
        <div class="metric-icon" style="color: #1677ff">
          <nz-icon nzType="code" />
        </div>
        <div class="metric-body">
          <span>JS</span>
          <strong>{{ report.summary.jsRawSize | formatSize }}</strong>
          <div class="metric-tag">{{ report.summary.jsFileCount || 0 }} 个文件</div>
        </div>
      </div>
      <div class="metric accent-green">
        <div class="metric-icon" style="color: #52c41a">
          <nz-icon nzType="bg-colors" />
        </div>
        <div class="metric-body">
          <span>CSS</span>
          <strong>{{ report.summary.cssRawSize | formatSize }}</strong>
          <div class="metric-tag">{{ report.summary.cssFileCount || 0 }} 个文件</div>
        </div>
      </div>
      <div class="metric metric-default">
        <div class="metric-icon compress">
          <nz-icon nzType="compress" />
        </div>
        <div class="metric-body">
          <span>Gzip</span>
          <strong>{{ report.summary.totalGzipSize | formatSize }}</strong>
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
          <strong>{{ report.summary.totalBrotliSize | formatSize }}</strong>
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
            @if (((report.summary.jsRawSize || 0) / report.summary.totalRawSize * 100) > 3) {
              <span>JS {{ ((report.summary.jsRawSize || 0) / report.summary.totalRawSize * 100).toFixed(0) }}%</span>
            }
          </div>
          <div class="size-bar-seg css" [style.flex]="report.summary.cssRawSize || 0">
            @if (((report.summary.cssRawSize || 0) / report.summary.totalRawSize * 100) > 3) {
              <span>CSS {{ ((report.summary.cssRawSize || 0) / report.summary.totalRawSize * 100).toFixed(0) }}%</span>
            }
          </div>
          <div class="size-bar-seg asset" [style.flex]="report.summary.assetRawSize || 0">
            @if (((report.summary.assetRawSize || 0) / report.summary.totalRawSize * 100) > 3) {
              <span>资源 {{ ((report.summary.assetRawSize || 0) / report.summary.totalRawSize * 100).toFixed(0) }}%</span>
            }
          </div>
        </div>
      </div>
    }
  `,
  styleUrls: ['./task-analysis-summary.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskAnalysisSummaryComponent {
  @Input({ required: true }) report!: TaskAnalyzeResultDto;

  protected readonly sizeLevel = getSizeLevel;

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
