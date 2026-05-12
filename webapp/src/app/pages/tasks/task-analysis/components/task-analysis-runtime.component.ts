import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';
import type { TaskRuntime } from '@models/task.model';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { FormatTimePipe, FormatMsPipe } from '@app/shared';

@Component({
  selector: 'app-task-analysis-runtime',
  standalone: true,
  imports: [CommonModule, NzIconModule, NzTagModule, NzTooltipModule, ClipboardModule, FormatTimePipe, FormatMsPipe],
  template: `
    <div class="summary-grid">
      <div class="metric">
        <div class="metric-icon">
          <nz-icon nzType="info-circle" />
        </div>
        <div class="metric-body">
          <span>状态</span>
          <strong>
            <nz-tag [nzColor]="runtimeSnapshot?.status === 'running' ? 'processing' : runtimeSnapshot?.status === 'success' ? 'success' : runtimeSnapshot?.status === 'failed' ? 'error' : 'default'">
              {{ runtimeSnapshot?.status || '-' }}
            </nz-tag>
          </strong>
        </div>
      </div>
      <div class="metric">
        <div class="metric-icon">
          <nz-icon nzType="check-circle" />
        </div>
        <div class="metric-body">
          <span>Ready</span>
          <strong>{{ runtimeSnapshot?.readyAt | formatTime }}</strong>
        </div>
      </div>
      <div class="metric">
        <div class="metric-icon">
          <nz-icon nzType="reload" />
        </div>
        <div class="metric-body">
          <span>最近编译</span>
          <strong>{{ runtimeSnapshot?.rebuildDurationMs | formatMs }}</strong>
        </div>
      </div>
      <div class="metric">
        <div class="metric-icon" style="color: #faad14">
          <nz-icon nzType="warning" />
        </div>
        <div class="metric-body">
          <span>Warnings</span>
          <strong>{{ runtimeSnapshot?.warningsCount || 0 }}</strong>
        </div>
      </div>
      <div class="metric">
        <div class="metric-icon" style="color: #ff4d4f">
          <nz-icon nzType="close-circle" />
        </div>
        <div class="metric-body">
          <span>Errors</span>
          <strong>{{ runtimeSnapshot?.errorsCount || 0 }}</strong>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">
        <nz-icon nzType="link" />
        <span>访问地址</span>
      </div>
      @if (runtimeUrls.length > 0) {
      <div class="url-list">
        @for (url of runtimeUrls; track url) {
        <div class="url-item">
          <a [href]="url" target="_blank" rel="noopener noreferrer">
            <nz-icon nzType="global" />
            {{ url }}
          </a>
          <button class="copy-btn" (click)="copyUrl(url)" [nz-tooltip]="copiedUrl === url ? '已复制' : '复制'">
            <nz-icon [nzType]="copiedUrl === url ? 'check' : 'copy'" />
          </button>
        </div>
        }
      </div>
      } @else {
      <div class="hint">
        <nz-icon nzType="info-circle" />
        尚未从输出日志中识别到 dev server 地址。
      </div>
      }
    </div>

    <div class="section">
      <div class="section-title">
        <nz-icon nzType="bulb" />
        <span>说明</span>
      </div>
      <div class="hint-box">
        <p>serve 分析关注 dev-server 运行状态、访问地址、增量编译耗时和 warning/error。</p>
        <p>如果 serve 链路产出了 <code>stats.json</code> 或 visualizer 报告，也可以接入 analyzer 展示；默认 Angular dev-server 不会落盘 bundle 体积报告。</p>
      </div>
    </div>
  `,
  styleUrls: ['./task-analysis-runtime.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskAnalysisRuntimeComponent {
  private clipboard = inject(Clipboard);

  @Input() runtimeSnapshot: TaskRuntime | null = null;
  @Input() runtimeUrls: string[] = [];

  copiedUrl = '';

  copyUrl(url: string) {
    if (this.clipboard.copy(url)) {
      this.copiedUrl = url;
      setTimeout(() => {
        if (this.copiedUrl === url) this.copiedUrl = '';
      }, 2000);
    }
  }
}
