import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { PanelCardComponent } from '@shared/ui';
import { IssueDetailNoteComponent } from '../../../issues/components/issue-detail-note/issue-detail-note.component';
import type { RdAction, RdItemEntity, RdLogEntity } from '../../models/rd.model';

@Component({
  selector: 'app-rd-activity-timeline',
  standalone: true,
  imports: [FormsModule, NzIconModule, NzSelectModule, PanelCardComponent, IssueDetailNoteComponent],
  template: `
    <app-panel-card [title]="'研发动态'" [empty]="filteredTimelineItems().length === 0" [emptyText]="'暂无动态'">
      @if (showFilter()) {
        <div panel-actions class="timeline-filter">
          <label class="timeline-filter__label">筛选</label>
          <nz-select
            class="timeline-filter__select"
            nzSize="small"
            [ngModel]="selectedFilter()"
            (ngModelChange)="onFilterModelChange($event)"
            [nzDropdownMatchSelectWidth]="false"
          >
            @for (opt of filterOptions(); track opt.value) {
              <nz-option [nzLabel]="opt.label" [nzValue]="opt.value"></nz-option>
            }
          </nz-select>
        </div>
      }
      <div class="timeline">
        @for (item of filteredTimelineItems(); track item.id) {
          <div class="timeline-log">
            <span nz-icon [nzType]="item.icon" class="timeline-log__icon"></span>
            <div class="timeline-log__body">
              <app-issue-detail-note [variant]="'timeline'">
                <span class="timeline-log__user">{{ item.actor }}</span>
                <span class="timeline-log__action">{{ item.action }}</span>
              </app-issue-detail-note>
            </div>
            <span class="timeline-log__time">{{ item.time }}</span>
          </div>
        }
      </div>
    </app-panel-card>
  `,
  styles: [
    `
      .timeline {
        display: grid;
        max-height: 420px;
        overflow: auto;
      }
      .timeline-filter__label {
        color: var(--text-muted);
        font-size: 12px;
      }
      .timeline-filter {
        display: inline-flex;
        align-items: center;
        gap: 10px;
      }
      .timeline-filter__select {
        min-width: 132px;
      }

      .timeline-log {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding: 14px 20px;
        border-top: 1px solid var(--border-color-soft);
        font-size: 13px;
      }

      .timeline-log__icon,
      .timeline-log__time {
        flex: 0 0 auto;
      }

      .timeline-log__icon {
        margin-top: 2px;
        color: var(--primary-500);
        font-size: 13px;
      }

      .timeline-log__body {
        min-width: 0;
        flex: 1 1 auto;
      }

      .timeline-log__user {
        margin-right: 6px;
        font-weight: 600;
        color: var(--text-primary);
      }

      .timeline-log__action {
        white-space: pre-wrap;
        word-break: break-word;
      }

      .timeline-log__time {
        margin-left: auto;
        font-size: 12px;
        color: var(--text-muted);
        line-height: 1.6;
      }

      @media (max-width: 768px) {
        .timeline-log {
          flex-wrap: wrap;
        }

        .timeline-log__body {
          flex-basis: calc(100% - 21px);
        }

        .timeline-log__time {
          width: 100%;
          margin-left: 21px;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdActivityTimelineComponent {
  readonly selectedFilter = signal<string>('all');
  readonly item = input.required<RdItemEntity>();
  readonly logs = input<RdLogEntity[]>([]);
  readonly showFilter = computed(() => this.logs().length > 10);

  readonly timelineItems = computed(() => {
    const logs = this.logs();
    if (logs.length === 0) {
      return [];
    }
    return logs.map((log) => ({
      id: log.id,
      icon: this.iconByAction(log.actionType),
      actionType: log.actionType,
      actor: log.operatorName || log.operatorId || '系统',
      action: log.content?.trim() || this.labelByAction(log.actionType),
      time: this.formatTime(log.createdAt),
    }));
  });
  readonly filterOptions = computed(() => {
    const uniqueActionTypes = Array.from(
      new Set(this.timelineItems().map((item) => item.actionType).filter((type) => !!type?.trim()))
    );
    return [
      { value: 'all', label: '全部' },
      ...uniqueActionTypes.map((type) => ({ value: type, label: this.actionTypeLabel(type) })),
    ];
  });
  readonly filteredTimelineItems = computed(() => {
    const selected = this.selectedFilter();
    const all = this.timelineItems();
    const hasSelected = this.filterOptions().some((item) => item.value === selected);
    if (selected === 'all' || !hasSelected) {
      return all;
    }
    return all.filter((item) => item.actionType === selected);
  });

  onFilterModelChange(value: string): void {
    const next = value?.trim() || 'all';
    const hasOption = this.filterOptions().some((item) => item.value === next);
    this.selectedFilter.set(hasOption ? next : 'all');
  }

  private labelByAction(action: RdAction): string {
    return (
      {
        create: '创建研发项',
        update: '更新研发项',
        start: '开始执行',
        block: '标记阻塞',
        resume: '恢复执行',
        reopen: '恢复研发项',
        complete: '标记完成',
        accept: '验收完成',
        close: '关闭研发项',
        advance_stage: '进入下一阶段',
        delete: '删除研发项',
      }[action] ?? action
    );
  }

  private actionTypeLabel(action: string): string {
    return (
      {
        create: '创建',
        update: '更新',
        start: '开始执行',
        block: '标记阻塞',
        resume: '恢复执行',
        reopen: '恢复研发项',
        complete: '标记完成',
        accept: '阶段完成',
        close: '关闭',
        advance_stage: '进入下一阶段',
        delete: '删除',
      }[action] ?? action
    );
  }

  private iconByAction(action: RdAction): string {
    return (
      {
        create: 'plus-circle',
        update: 'edit',
        start: 'play-circle',
        block: 'pause-circle',
        resume: 'redo',
        reopen: 'rollback',
        complete: 'check-circle',
        accept: 'safety-certificate',
        close: 'close-circle',
        advance_stage: 'right-circle',
        delete: 'delete',
      }[action] ?? 'history'
    );
  }

  private formatTime(value: string): string {
    return new Intl.DateTimeFormat('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(value));
  }
}
