import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpaceModule } from 'ng-zorro-antd/space';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import { SyslogStreamService } from '@app/core/log/syslog-stream.service';
import { LogLevel } from '@models/log.model';
import { ProjectStateService } from '@pages/projects/services/project.state.service';

@Component({
  selector: 'app-system-log',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    NzTagModule,
    NzDrawerModule,
    NzButtonModule,
    NzSpaceModule,
    NzIconModule,
    NzTooltipModule,
  ],
  templateUrl: './system-log.component.html',
  styleUrl: './system-log.component.less',
})
export class SystemLogDrawerComponent implements OnInit {
  private sysLogStream = inject(SyslogStreamService);
  private projectState = inject(ProjectStateService);
  private logBox = viewChild<ElementRef<HTMLDivElement>>('logBox');
  // 自动跟随（可选开关，默认开更符合日志体验）
  readonly autoFollow = signal(true);
  // signal 化，便于模板调用 isOpen()
  readonly isOpen = signal(false);

  readonly curProjectPath = computed(() => this.projectState.currentProject()?.root || '');

  // lines 是 computed，跟随 logs signal 更新
  readonly lines = computed(() => this.sysLogStream.logs());

  readonly lastLine = computed(() => {
    const logs = this.sysLogStream.logs();
    return logs.length ? logs[logs.length - 1] : null;
  });

  // 可用于 badge
  readonly unread = computed(() => this.sysLogStream.unread());
  constructor() {
    // 让 service 知道 drawer 开关，用于 unread 正确累加/清零
    effect(() => {
      this.sysLogStream.setDrawerOpen(this.isOpen());
      // 打开 drawer 时滚到底
      if (this.isOpen()) queueMicrotask(() => this.toBottom());
    });
    // 新日志到来且开启 autoFollow 时滚到底
    effect(() => {
      // 依赖 lines() 触发
      this.lines();
      if (!this.isOpen()) return;
      if (!this.autoFollow()) return;
      queueMicrotask(() => this.toBottom());
    });
  }
  ngOnInit(): void {
    // 应用启动就订阅一次（幂等）
    this.sysLogStream.enable(300);
  }

  openLog() {
    this.isOpen.set(true);
  }

  closeLog() {
    this.isOpen.set(false);
  }

  clearLog() {
    this.sysLogStream.clear();
  }

  toBottom() {
    const el = this.logBox()?.nativeElement;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }

  /** 给 @for 的 trackBy，用 index 或 ts+refId+text  */
  trackByLine = (_: number, l: any) => `${l.ts}-${l.refId ?? ''}-${l.text}`;

  getColor(level?: LogLevel): string {
    if (!level) return "#000000";
    switch (level) {
      case 'success': return "#22c55e"; 
      case 'info': return "#18bdfd";
      case 'debug': return "#94a3b8";
      case "error": return "#ef4444";
      case "warn": return "#f59e0b";
      default: return "#000000";
    }
  }
}
