import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  inject,
  Input,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { TaskKind, TaskRow, TaskRuntime } from '@models/task.model';
import type { TaskDashboardDto } from '@yinuo-ngm/protocol';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipDirective, NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { interval } from 'rxjs';

@Component({
  selector: 'app-task-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    NzIconModule,
    NzTagModule,
    NzTooltipModule,
    NzProgressModule,
    ClipboardModule,
    NzTooltipDirective,
  ],
  template: `
    <div class="dashboard-panel">
      @if (taskKind === 'serve') {
        <!-- ========== Serve 仪表盘 ========== -->
        <div class="dash-section-title">
          <nz-icon nzType="cloud-server" />
          <span>Dev Server 运行状态</span>
        </div>

        <div class="dash-grid serve-grid">
          <div class="dash-card">
            <div class="dash-card-label">
              <nz-icon nzType="info-circle" />
              <span>状态</span>
            </div>
            <div class="dash-card-value">
              <nz-tag [nzColor]="statusColor()">{{ statusText() }}</nz-tag>
            </div>
          </div>

          <div class="dash-card">
            <div class="dash-card-label">
              <nz-icon nzType="number" />
              <span>PID</span>
            </div>
            <div class="dash-card-value mono">{{ runtime?.pid || '-' }}</div>
          </div>

          <div class="dash-card">
            <div class="dash-card-label">
              <nz-icon nzType="clock-circle" />
              <span>运行时长</span>
            </div>
            <div class="dash-card-value">{{ liveDuration() }}</div>
          </div>

          <div class="dash-card">
            <div class="dash-card-label">
              <nz-icon nzType="check-circle" />
              <span>Ready 时间</span>
            </div>
            <div class="dash-card-value">{{ formatTime(runtime?.readyAt) }}</div>
          </div>

          <div class="dash-card">
            <div class="dash-card-label">
              <nz-icon nzType="reload" />
              <span>最近编译</span>
            </div>
            <div class="dash-card-value">{{ formatMs(runtime?.rebuildDurationMs) }}</div>
          </div>

          <div class="dash-card">
            <div class="dash-card-label">
              <nz-icon nzType="warning" style="color: #faad14" />
              <span>Warnings</span>
            </div>
            <div class="dash-card-value warn">{{ runtime?.warningsCount || 0 }}</div>
          </div>

          <div class="dash-card">
            <div class="dash-card-label">
              <nz-icon nzType="close-circle" style="color: #ff4d4f" />
              <span>Errors</span>
            </div>
            <div class="dash-card-value error">{{ runtime?.errorsCount || 0 }}</div>
          </div>

          <div class="dash-card">
            <div class="dash-card-label">
              <nz-icon nzType="thunderbolt" />
              <span>Run ID</span>
            </div>
            <div class="dash-card-value mono text-sm">{{ runtime?.runId || '-' }}</div>
          </div>

          <div class="dash-card dash-card-full">
            <div class="dash-card-label">
              <nz-icon nzType="link" />
              <span>访问地址</span>
            </div>
            <div class="dash-card-value">
              @if (serveUrls().length > 0) {
                <div class="url-list">
                  @for (url of serveUrls(); track url) {
                    <div class="url-item">
                      <a [href]="url" target="_blank" rel="noopener noreferrer">{{ url }}</a>
                      <button
                        class="copy-btn"
                        (click)="copyUrl(url)"
                        [nz-tooltip]="copiedUrl === url ? '已复制' : '复制'"
                      >
                        <nz-icon [nzType]="copiedUrl === url ? 'check' : 'copy'" />
                      </button>
                    </div>
                  }
                </div>
              } @else {
                <span class="text-muted">尚未从输出日志中识别到 dev server 地址</span>
              }
            </div>
          </div>
        </div>
      } @else {
        <!-- ========== Build 仪表盘 ========== -->
        <div class="dash-section-title">
          <nz-icon nzType="build" />
          <span>构建概览</span>
        </div>

        <div class="dash-grid build-grid">
          <div class="dash-card">
            <div class="dash-card-label">
              <nz-icon nzType="info-circle" />
              <span>状态</span>
            </div>
            <div class="dash-card-value">
              <nz-tag [nzColor]="statusColor()">{{ statusText() }}</nz-tag>
            </div>
          </div>

          <div class="dash-card">
            <div class="dash-card-label">
              <nz-icon nzType="clock-circle" />
              <span>构建时长</span>
            </div>
            <div class="dash-card-value">{{ buildDuration() }}</div>
          </div>

          <div class="dash-card">
            <div class="dash-card-label">
              <nz-icon nzType="warning" style="color: #faad14" />
              <span>Warnings</span>
            </div>
            <div class="dash-card-value warn">{{ runtime?.warningsCount || 0 }}</div>
          </div>

          <div class="dash-card">
            <div class="dash-card-label">
              <nz-icon nzType="close-circle" style="color: #ff4d4f" />
              <span>Errors</span>
            </div>
            <div class="dash-card-value error">{{ runtime?.errorsCount || 0 }}</div>
          </div>

          <div class="dash-card">
            <div class="dash-card-label">
              <nz-icon nzType="number" />
              <span>Run ID</span>
            </div>
            <div class="dash-card-value mono text-sm">{{ runtime?.runId || '-' }}</div>
          </div>
        </div>

        @if (hasSizeData()) {
          <div class="dash-section-title">
            <nz-icon nzType="pie-chart" />
            <span>构建体积</span>
          </div>

          <div class="dash-grid build-size-grid">
            <div class="dash-card accent-blue">
              <div class="dash-card-label">总体积</div>
              <div class="dash-card-value size">
                {{ formatSize(taskDashboard?.sizes?.totalRawSize) }}
              </div>
              @if (taskDashboard?.sizes?.totalGzipSize) {
                <div class="dash-card-sub">
                  Gzip: {{ formatSize(taskDashboard?.sizes?.totalGzipSize) }} (节省
                  {{ gzipSavings() }})
                </div>
              }
            </div>

            <div class="dash-card accent-indigo">
              <div class="dash-card-label">JS</div>
              <div class="dash-card-value size">
                {{ formatSize(taskDashboard?.sizes?.jsRawSize) }}
              </div>
            </div>

            <div class="dash-card accent-green">
              <div class="dash-card-label">CSS</div>
              <div class="dash-card-value size">
                {{ formatSize(taskDashboard?.sizes?.cssRawSize) }}
              </div>
            </div>

            <div class="dash-card accent-orange">
              <div class="dash-card-label">其他资源</div>
              <div class="dash-card-value size">
                {{ formatSize(taskDashboard?.sizes?.assetRawSize) }}
              </div>
            </div>

            <div class="dash-card">
              <div class="dash-card-label">文件总数</div>
              <div class="dash-card-value">{{ taskDashboard?.sizes?.fileCount || 0 }}</div>
            </div>
          </div>

          <!-- 体积比例条 -->
          <div class="size-bar-container">
            <div class="size-bar">
              <div
                class="size-bar-segment js"
                [style.flex]="taskDashboard?.sizes?.jsRawSize || 0"
                nz-tooltip
                nzTooltipTitle="JS"
              >
                @if (jsPercent() > 8) {
                  <span>JS {{ jsPercent() }}%</span>
                }
              </div>
              <div
                class="size-bar-segment css"
                [style.flex]="taskDashboard?.sizes?.cssRawSize || 0"
                nz-tooltip
                nzTooltipTitle="CSS"
              >
                @if (cssPercent() > 8) {
                  <span>CSS {{ cssPercent() }}%</span>
                }
              </div>
              <div
                class="size-bar-segment asset"
                [style.flex]="taskDashboard?.sizes?.assetRawSize || 0"
                nz-tooltip
                nzTooltipTitle="其他资源"
              >
                @if (assetPercent() > 8) {
                  <span>资源 {{ assetPercent() }}%</span>
                }
              </div>
            </div>
            <div class="size-bar-legend">
              <span class="legend-item"><span class="dot js"></span>JS</span>
              <span class="legend-item"><span class="dot css"></span>CSS</span>
              <span class="legend-item"><span class="dot asset"></span>其他</span>
            </div>
          </div>

          @if (taskDashboard?.sizes?.outputPath) {
            <div class="dash-card dash-card-full">
              <div class="dash-card-label">
                <nz-icon nzType="folder" />
                <span>输出目录</span>
              </div>
              <div class="dash-card-value mono text-sm">{{ taskDashboard?.sizes?.outputPath }}</div>
            </div>
          }
        } @else {
          <div class="dash-empty">
            <nz-icon nzType="inbox" class="empty-icon" />
            <span>构建成功后将显示体积分析数据</span>
          </div>
        }
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
        overflow: auto;
      }

      .dashboard-panel {
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .dash-section-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        font-weight: 600;
        color: #26394d;
        padding: 4px 0;
      }

      .dash-section-title nz-icon {
        font-size: 16px;
        color: #1677ff;
      }

      .dash-grid {
        display: grid;
        gap: 12px;
      }

      .serve-grid {
        grid-template-columns: repeat(4, 1fr);
      }

      .build-grid {
        grid-template-columns: repeat(5, 1fr);
      }

      .build-size-grid {
        grid-template-columns: repeat(5, 1fr);
      }

      .dash-card {
        background: #fff;
        border: 1px solid #eef1f4;
        border-radius: 8px;
        padding: 12px;
        min-width: 0;
        transition: box-shadow 0.2s;
      }

      .dash-card:hover {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      }

      .dash-card-full {
        grid-column: 1 / -1;
      }

      .dash-card-label {
        display: flex;
        align-items: center;
        gap: 6px;
        color: #7a8a99;
        font-size: 12px;
        margin-bottom: 8px;
      }

      .dash-card-label nz-icon {
        font-size: 13px;
      }

      .dash-card-value {
        color: #26394d;
        font-size: 18px;
        font-weight: 600;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .dash-card-value.size {
        font-size: 20px;
      }

      .dash-card-value.mono {
        font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      }

      .dash-card-value.text-sm {
        font-size: 13px;
        font-weight: 500;
      }

      .dash-card-value.warn {
        color: #faad14;
      }

      .dash-card-value.error {
        color: #ff4d4f;
      }

      .dash-card-sub {
        margin-top: 4px;
        color: #7a8a99;
        font-size: 12px;
      }

      /* 彩色顶部边框变体 */
      .accent-blue {
        border-top: 3px solid #1677ff;
      }
      .accent-indigo {
        border-top: 3px solid #722ed1;
      }
      .accent-green {
        border-top: 3px solid #52c41a;
      }
      .accent-orange {
        border-top: 3px solid #fa8c16;
      }

      /* URL 列表 */
      .url-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .url-item {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .url-item a {
        color: #1677ff;
        font-size: 14px;
        font-weight: 500;
        text-decoration: none;
        word-break: break-all;
      }

      .url-item a:hover {
        text-decoration: underline;
      }

      .copy-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border: 1px solid #d9d9d9;
        border-radius: 6px;
        background: #fff;
        cursor: pointer;
        color: #595959;
        transition: all 0.2s;
        flex-shrink: 0;
      }

      .copy-btn:hover {
        border-color: #1677ff;
        color: #1677ff;
      }

      /* 体积比例条 */
      .size-bar-container {
        padding: 4px 0;
      }

      .size-bar {
        display: flex;
        height: 32px;
        border-radius: 6px;
        overflow: hidden;
        background: #f0f2f5;
      }

      .size-bar-segment {
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 0;
        color: #fff;
        font-size: 12px;
        font-weight: 600;
        transition: flex 0.3s;
        overflow: hidden;
      }

      .size-bar-segment span {
        white-space: nowrap;
        padding: 0 6px;
      }

      .size-bar-segment.js {
        background: #1677ff;
      }
      .size-bar-segment.css {
        background: #52c41a;
      }
      .size-bar-segment.asset {
        background: #fa8c16;
      }

      .size-bar-legend {
        display: flex;
        gap: 16px;
        margin-top: 8px;
        font-size: 12px;
        color: #7a8a99;
      }

      .legend-item {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .dot {
        display: inline-block;
        width: 10px;
        height: 10px;
        border-radius: 2px;
      }

      .dot.js {
        background: #1677ff;
      }
      .dot.css {
        background: #52c41a;
      }
      .dot.asset {
        background: #fa8c16;
      }

      /* 空状态 */
      .dash-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 48px 16px;
        color: #7a8a99;
      }

      .empty-icon {
        font-size: 40px;
        color: #d9d9d9;
      }

      .text-muted {
        color: #7a8a99;
        font-size: 13px;
        font-weight: 400;
      }

      @media (max-width: 1100px) {
        .serve-grid {
          grid-template-columns: repeat(3, 1fr);
        }
        .build-grid {
          grid-template-columns: repeat(3, 1fr);
        }
        .build-size-grid {
          grid-template-columns: repeat(3, 1fr);
        }
      }

      @media (max-width: 768px) {
        .serve-grid {
          grid-template-columns: repeat(2, 1fr);
        }
        .build-grid {
          grid-template-columns: repeat(2, 1fr);
        }
        .build-size-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }
    `,
  ],
})
export class TaskDashboardComponent implements OnInit {
  @Input() taskRow: TaskRow | null = null;
  @Input() taskDashboard: TaskDashboardDto | null = null;
  @Input() taskKind: TaskKind | undefined;

  private destroyRef = inject(DestroyRef);
  private clipboard = inject(Clipboard);

  private _liveNow = signal(Date.now());
  copiedUrl = '';

  ngOnInit() {
    interval(1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this._liveNow.set(Date.now()));
  }

  get runtime(): TaskRuntime | undefined {
    return this.taskRow?.runtime;
  }

  statusColor(): string {
    const s = this.runtime?.status;
    if (s === 'running') return 'processing';
    if (s === 'stopping') return 'warning';
    if (s === 'success') return 'success';
    if (s === 'failed') return 'error';
    if (s === 'stopped') return 'default';
    return 'default';
  }

  statusText(): string {
    const s = this.runtime?.status;
    const map: Record<string, string> = {
      idle: '空闲',
      running: '运行中',
      stopping: '停止中',
      success: '成功',
      failed: '失败',
      stopped: '已停止',
    };
    return map[s || 'idle'] || s || '-';
  }

  liveDuration(): string {
    const r = this.runtime;
    if (!r?.startedAt) return '-';
    if (r.stoppedAt) {
      return this.calcDuration(r.startedAt, r.stoppedAt);
    }
    const now = this._liveNow();
    return this.calcDuration(r.startedAt, now);
  }

  buildDuration(): string {
    const r = this.runtime;
    if (!r?.startedAt) return '-';
    const end = r.stoppedAt || this._liveNow();
    return this.calcDuration(r.startedAt, end);
  }

  serveUrls(): string[] {
    return this.runtime?.urls || this.taskDashboard?.urls || [];
  }

  hasSizeData(): boolean {
    const s = this.taskDashboard?.sizes;
    return !!(s && s.fileCount > 0);
  }

  jsPercent(): number {
    const s = this.taskDashboard?.sizes;
    if (!s?.totalRawSize) return 0;
    return Math.round(((s.jsRawSize || 0) / s.totalRawSize) * 100);
  }

  cssPercent(): number {
    const s = this.taskDashboard?.sizes;
    if (!s?.totalRawSize) return 0;
    return Math.round(((s.cssRawSize || 0) / s.totalRawSize) * 100);
  }

  assetPercent(): number {
    return 100 - this.jsPercent() - this.cssPercent();
  }

  gzipSavings(): string {
    const s = this.taskDashboard?.sizes;
    if (!s?.totalRawSize || !s?.totalGzipSize) return '0%';
    const savings = ((s.totalRawSize - s.totalGzipSize) / s.totalRawSize) * 100;
    return `${savings.toFixed(1)}%`;
  }

  formatTime(value?: number): string {
    if (!value) return '-';
    return new Date(value).toLocaleTimeString();
  }

  formatMs(value?: number): string {
    if (typeof value !== 'number') return '-';
    return value >= 1000 ? `${(value / 1000).toFixed(2)}s` : `${value}ms`;
  }

  formatSize(size?: number): string {
    const value = Number(size ?? 0);
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / 1024 / 1024).toFixed(2)} MB`;
  }

  copyUrl(url: string) {
    if (this.clipboard.copy(url)) {
      this.copiedUrl = url;
      setTimeout(() => {
        if (this.copiedUrl === url) this.copiedUrl = '';
      }, 2000);
    }
  }

  private calcDuration(startedAt: number, endAt: number): string {
    const seconds = Math.max(0, Math.floor((endAt - startedAt) / 1000));
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const restMinutes = minutes % 60;
    const restSeconds = seconds % 60;
    if (hours > 0) return `${hours}h ${restMinutes}m ${restSeconds}s`;
    if (minutes > 0) return `${minutes}m ${restSeconds}s`;
    return `${restSeconds}s`;
  }
}
