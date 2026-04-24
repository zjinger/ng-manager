import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { Subscription, filter } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';

import { LogEntry, NginxLogViewerComponent } from '../../nginx-log-viewer/nginx-log-viewer.component';
import { NginxService } from '../../../services/nginx.service';
import { WsClientService } from '@app/core/ws';
import type { NginxLogAppendMsg, NginxLogTailMsg, NginxLogType } from '@app/core/ws/ws.types';

@Component({
  selector: 'app-nginx-secondary-logs-tab',
  standalone: true,
  imports: [CommonModule, NzButtonModule, NzIconModule, NginxLogViewerComponent],
  template: `
    <div class="panel-header-row compact">
      <div class="log-tabs">
        <button class="log-tab" [class.active]="activeLogTab() === 'error'" (click)="switchLogTab('error')">
          error.log
        </button>
        <button class="log-tab" [class.active]="activeLogTab() === 'access'" (click)="switchLogTab('access')">
          access.log
        </button>
      </div>
      <div class="log-actions">
        <button nz-button nzType="default" class="log-action-btn"  (click)="scrollToBottom()">
          <nz-icon nzType="vertical-align-bottom" nzTheme="outline" />
        </button>
        <button nz-button nzType="default"  (click)="refreshLogs()">
          <nz-icon nzType="reload" nzTheme="outline" />
        </button>
        <button nz-button nzType="default" class="log-action-btn" (click)="clearLogs()">
          <nz-icon nzType="delete" nzTheme="outline" />
        </button>
      </div>
    </div>
    <app-nginx-log-viewer
      [title]="activeLogTab() === 'error' ? 'error.log' : 'access.log'"
      [showRealtime]="isConnected()"
      [status]="statusText()"
      [statusTone]="statusTone()"
      [logs]="currentLogs()"
      [maxHeight]="400"
    ></app-nginx-log-viewer>
  `,
  styles: [`
    :host {
      display: block;
    }

    .panel-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;

      &.compact {
        margin-bottom: 10px;
      }
    }

    .log-tabs {
      display: flex;
      gap: 0;
    }

    .log-tab {
      background: transparent;
      color: var(--text-3);
      font-size: var(--nginx-font-size-sm, 12px);
      font-weight: 500;
      padding: 6px 12px;
      cursor: pointer;
      transition: all 120ms ease;
      border: none;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;

      &:hover {
        color: var(--text-2);
      }

      &.active {
        color: var(--blue);
        border-bottom-color: var(--blue);
        font-weight: 600;
      }
    }

    .log-actions {
      display: flex;
      gap: 4px;
    }

    .log-action-btn {
      nz-icon {
        font-size: 12px;
      }
    }
  `],
})
export class NginxSecondaryLogsTabComponent implements OnInit, OnDestroy {
  private nginxService = inject(NginxService);
  private wsClient = inject(WsClientService);
  private message = inject(NzMessageService);
  private wsSub?: Subscription;
  @ViewChild(NginxLogViewerComponent)
  private logViewerComponent: NginxLogViewerComponent | undefined;

  activeLogTab = signal<NginxLogType>('error');
  isConnected = signal(false);
  loading = signal(false);

  // 分别存储 error 和 access 日志
  errorLogs = signal<LogEntry[]>([]);
  accessLogs = signal<LogEntry[]>([]);

  // 当前显示的日志
  currentLogs = signal<LogEntry[]>([]);

  // 最大日志行数限制
  private readonly maxLogLines = 500;

  statusText = signal('未连接');
  statusTone = signal<'default' | 'ok' | 'warn' | 'error'>('default');

  ngOnInit() {
    this.setupWsSubscription();
    this.loadInitialLogs();
  }

  ngOnDestroy() {
    this.unsubscribeWs();
    this.wsSub?.unsubscribe();
  }

  switchLogTab(tab: NginxLogType) {
    this.activeLogTab.set(tab);
    this.updateCurrentLogs();

    // 切换 tab 时重新订阅
    if (this.isConnected()) {
      this.unsubscribeWs();
      this.subscribeWs(tab);
    }
  }

  /**
   * 滚动日志视图到底部
   */
  scrollToBottom() {
    this.logViewerComponent?.scrollToBottom();
  }

  async refreshLogs() {
    await this.loadInitialLogs();
    this.message.success('日志已刷新');
  }

  clearLogs() {
    const tab = this.activeLogTab();
    if (tab === 'error') {
      this.errorLogs.set([]);
    } else {
      this.accessLogs.set([]);
    }
    this.updateCurrentLogs();
  }

  private setupWsSubscription() {
    // 监听 WebSocket 连接状态
    this.wsClient.stateChanges().subscribe(state => {
      const connected = state === 'open';
      this.isConnected.set(connected);
      this.statusText.set(connected ? '已连接' : state === 'connecting' ? '连接中...' : '未连接');
      this.statusTone.set(connected ? 'ok' : 'default');

      if (connected) {
        this.subscribeWs(this.activeLogTab());
      }
    });

    // 监听 nginx 日志消息
    this.wsSub = this.wsClient.messages()
      .pipe(
        filter((msg): msg is NginxLogAppendMsg | NginxLogTailMsg =>
          msg.op === 'nginx.log.append' || msg.op === 'nginx.log.tail'
        )
      )
      .subscribe(msg => {
        if (msg.op === 'nginx.log.tail') {
          this.handleLogTail(msg);
          setTimeout(() => {
            this.scrollToBottom();
          }, 100);
        } else if (msg.op === 'nginx.log.append') {
          this.handleLogAppend(msg);
        }
      });

    // 确保 WebSocket 连接
    this.wsClient.connect();
  }

  private subscribeWs(logType: NginxLogType) {
    this.wsClient.send({
      op: 'sub',
      topic: 'nginx',
      logType,
      tail: 50
    });
  }

  private unsubscribeWs() {
    this.wsClient.send({
      op: 'unsub',
      topic: 'nginx'
    });
  }

  private handleLogTail(msg: NginxLogTailMsg) {
    const entries = msg.lines.map(line => this.parseLogLine(line));
    if (msg.logType === 'error') {
      this.errorLogs.set(entries);
    } else {
      this.accessLogs.set(entries);
    }
    this.updateCurrentLogs();
  }

  private handleLogAppend(msg: NginxLogAppendMsg) {
    const entry = this.parseLogLine(msg.line);
    const isCurrentTab = msg.logType === this.activeLogTab();

    if (msg.logType === 'error') {
      this.errorLogs.update(logs => {
        const updated = [...logs, entry];
        return updated.length > this.maxLogLines ? updated.slice(-this.maxLogLines) : updated;
      });
    } else {
      this.accessLogs.update(logs => {
        const updated = [...logs, entry];
        return updated.length > this.maxLogLines ? updated.slice(-this.maxLogLines) : updated;
      });
    }

    if (isCurrentTab) {
      this.updateCurrentLogs();
    }
  }

  private updateCurrentLogs() {
    const tab = this.activeLogTab();
    const logs = tab === 'error' ? this.errorLogs() : this.accessLogs();
    this.currentLogs.set(logs);
  }

  private async loadInitialLogs() {
    this.loading.set(true);
    try {
      const [errorRes, accessRes] = await Promise.all([
        this.nginxService.getErrorLogs(100),
        this.nginxService.getAccessLogs(100)
      ]);

      if (errorRes.lines) {
        this.errorLogs.set(errorRes.lines.map((line: string) => this.parseLogLine(line)));
      }

      if (accessRes.lines) {
        this.accessLogs.set(accessRes.lines.map((line: string) => this.parseLogLine(line)));
      }

      this.updateCurrentLogs();
    } catch (err: any) {
      this.message.error('加载日志失败: ' + err.message);
    } finally {
      this.loading.set(false);
    }
  }

  private parseLogLine(line: string): LogEntry {
    // 解析 nginx 日志行，提取时间和级别
    const timeMatch = line.match(/^(\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2})/);
    const levelMatch = line.match(/\[(error|warn|notice|info|crit|alert|emerg)\]/i);

    let time = '';
    if (timeMatch) {
      time = timeMatch[1].split(/\s+/)[1] || timeMatch[1];
    } else {
      // 尝试其他格式
      const altTimeMatch = line.match(/(\d{2}:\d{2}:\d{2})/);
      time = altTimeMatch ? altTimeMatch[1] : new Date().toLocaleTimeString('zh-CN', { hour12: false });
    }

    let level: LogEntry['level'] = 'info';
    if (levelMatch) {
      const lvl = levelMatch[1].toLowerCase();
      if (lvl === 'error' || lvl === 'crit' || lvl === 'alert' || lvl === 'emerg') {
        level = 'error';
      } else if (lvl === 'warn') {
        level = 'warn';
      }
    }

    return { time, level, msg: line };
  }
}
