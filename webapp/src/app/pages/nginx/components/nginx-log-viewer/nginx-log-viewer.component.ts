import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';

export interface LogEntry {
  time: string;
  level: 'info' | 'warn' | 'error' | 'ok';
  msg: string;
}

@Component({
  selector: 'app-nginx-log-viewer',
  standalone: true,
  imports: [CommonModule, NzIconModule],
  template: `
    <div class="log-panel">
      <div class="log-header">
        <span class="log-header-title">{{ title }}</span>
        <span
          class="log-header-status"
          [class.realtime]="showRealtime"
          [class.status-ok]="statusTone === 'ok'"
          [class.status-warn]="statusTone === 'warn'"
          [class.status-error]="statusTone === 'error'"
        >
          @if (showRealtime) {
            <span class="realtime-dot"></span>
            实时
          } @else {
            {{ status }}
          }
        </span>
      </div>
      <div class="log-body" [style.maxHeight.px]="maxHeight">
        @if (logs.length === 0) {
          <div class="log-empty">暂无日志</div>
        }
        @for (log of logs; track $index) {
          <div class="log-line">
            <span class="log-time">{{ log.time }}</span>
            <span class="log-level" [class]="getLevelClass(log.level)">
              {{ getLevelLabel(log.level) }}
            </span>
            <span class="log-msg">{{ log.msg }}</span>
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .log-panel {
      background: #1b2332;
      border-radius: 6px;
      overflow: hidden;
    }

    .log-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 14px;
      background: rgba(0, 0, 0, 0.15);
    }

    .log-header-title {
      font-size: var(--nginx-font-size-sm, 12px);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: rgba(255, 255, 255, 0.4);
    }

    .log-header-status {
      font-size: var(--nginx-font-size-sm, 12px);
      color: rgba(255, 255, 255, 0.5);
      font-family: var(--nginx-font-family-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace);
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 5px;

      &.realtime {
        color: #3dd68c;
      }

      &.status-ok {
        color: #3dd68c;
      }

      &.status-warn {
        color: #f7ba1e;
      }

      &.status-error {
        color: #ef5350;
      }
    }

    .realtime-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #3dd68c;
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%,
      100% {
        opacity: 1;
      }

      50% {
        opacity: 0.4;
      }
    }

    .log-body {
      padding: 10px 14px;
      max-height: 180px;
      overflow-y: auto;
      font-family: var(--nginx-font-family-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace);
      font-size: var(--nginx-font-size-sm, 12px);
      line-height: 1.8;

      &::-webkit-scrollbar {
        width: 6px;
      }

      &::-webkit-scrollbar-track {
        background: transparent;
      }

      &::-webkit-scrollbar-thumb {
        background: #333944;
        border-radius: 3px;
      }
    }

    .log-empty {
      padding: 16px 0;
      font-size: var(--nginx-font-size-sm, 12px);
      color: rgba(255, 255, 255, 0.35);
      text-align: center;
      font-family: var(--nginx-font-family-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace);
    }

    .log-line {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      cursor: default;
    }

    .log-time {
      color: rgba(255, 255, 255, 0.2);
      flex-shrink: 0;
      min-width: 46px;
    }

    .log-level {
      font-weight: 700;
      flex-shrink: 0;
      width: 32px;

      &.info {
        color: #165dff;
      }

      &.warn {
        color: #ff7d00;
      }

      &.error {
        color: #ef5350;
      }

      &.ok {
        color: #3dd68c;
      }
    }

    .log-msg {
      color: rgba(255, 255, 255, 0.55);
      flex: 1;
      word-break: break-all;
      white-space: pre-wrap;
    }
  `,
})
export class NginxLogViewerComponent {
  @Input() title: string = 'error.log';
  @Input() status: string = '';
  @Input() statusTone: 'default' | 'ok' | 'warn' | 'error' = 'default';
  @Input() showRealtime: boolean = false;
  @Input() maxHeight: number = 0;
  @Input() logs: LogEntry[] = [];

  getLevelClass(level: string): string {
    return level;
  }

  getLevelLabel(level: string): string {
    const map: Record<string, string> = {
      info: 'INFO',
      warn: 'WARN',
      error: 'ERR',
      ok: 'OK',
    };
    return map[level] ?? level.toUpperCase();
  }
}


