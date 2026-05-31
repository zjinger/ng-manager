import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';

import { RD_STAGE_TASK_STATUS_LABELS, type RdStageTaskEntity } from '../../models/rd.model';
import type { ProjectMemberEntity } from '../../../projects/models/project.model';
import type { RdStageTaskEditDraft } from '../rd-stage-task-edit-dialog/rd-stage-task-edit-dialog.component';

export type RdEditStageTaskDraft = RdStageTaskEditDraft & {
  original: RdStageTaskEntity | null;
};

@Component({
  selector: 'app-rd-edit-stage-task-list',
  standalone: true,
  imports: [NzButtonModule, NzIconModule, NzPopconfirmModule, NzToolTipModule],
  template: `
    <div class="task-list-shell">
      <div class="task-list-shell__head">
        <div>
          <strong>当前阶段任务</strong>
          <span>{{ drafts().length }} 项</span>
        </div>
        <button nz-button nzType="default" type="button" [disabled]="!canEdit()" (click)="add.emit()">
          <span nz-icon nzType="plus"></span>
          新增任务
        </button>
      </div>

      @if (!canEdit()) {
        <div class="task-empty">当前研发项没有可用阶段，不能维护阶段任务。</div>
      } @else if (drafts().length === 0) {
        <div class="task-empty">当前阶段暂无任务，可点击右上角新增任务。</div>
      } @else {
        <div class="task-list">
          @for (draft of drafts(); track draft.localId) {
            <article class="task-row" [class.task-row--invalid]="!isDraftValid(draft)">
              <div class="task-row__main">
                <div class="task-row__title">
                  <strong>{{ draft.title || '未填写任务标题' }}</strong>
                  @if (draftState(draft); as state) {
                    <span class="task-row__badge">{{ state }}</span>
                  }
                </div>
                <div class="task-row__meta">
                  <span>负责人：{{ ownerNames(draft.ownerIds) || '未指定' }}</span>
                  <span>计划：{{ formatDateRange(draft.plannedStartDate, draft.plannedEndDate) || '未设置' }}</span>
                  @if (draft.original) {
                    <span>{{ RD_STAGE_TASK_STATUS_LABELS[draft.original.status] }} · {{ draft.original.progress }}%</span>
                  }
                </div>
                <p class="task-row__desc">{{ descriptionSummary(draft.description) }}</p>
              </div>
              <div class="task-row__actions">
                <button
                  nz-button
                  nzType="default"
                  type="button"
                  class="task-row__icon-btn"
                  nz-tooltip
                  nzTooltipTitle="编辑任务"
                  aria-label="编辑任务"
                  (click)="edit.emit(draft.localId)"
                >
                  <span nz-icon nzType="edit"></span>
                </button>
                @if (draft.taskId) {
                  <button
                    nz-button
                    nzType="text"
                    nzDanger
                    type="button"
                    class="task-row__icon-btn"
                    nz-tooltip
                    nzTooltipTitle="取消任务"
                    aria-label="取消任务"
                    nz-popconfirm
                    nzPopconfirmTitle="确认取消该阶段任务吗？取消后该任务不再参与当前阶段进度统计。"
                    nzOkText="确认取消"
                    nzCancelText="保留"
                    (nzOnConfirm)="remove.emit(draft.localId)"
                  >
                    <span nz-icon nzType="delete"></span>
                  </button>
                } @else {
                  <button
                    nz-button
                    nzType="text"
                    nzDanger
                    type="button"
                    class="task-row__icon-btn"
                    nz-tooltip
                    nzTooltipTitle="移除任务"
                    aria-label="移除任务"
                    (click)="remove.emit(draft.localId)"
                  >
                    <span nz-icon nzType="delete"></span>
                  </button>
                }
              </div>
            </article>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .task-list-shell {
        display: grid;
        gap: 10px;
      }
      .task-list-shell__head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .task-list-shell__head > div {
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .task-list-shell__head strong {
        color: var(--text-primary);
        font-size: 14px;
      }
      .task-list-shell__head span {
        color: var(--text-muted);
        font-size: 12px;
      }
      .task-list {
        display: grid;
        gap: 8px;
        max-height: min(320px, 38vh);
        overflow-y: auto;
        padding-right: 4px;
      }
      .task-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 12px;
        padding: 10px 12px;
        border: 1px solid var(--border-color-soft);
        border-radius: 8px;
        background: var(--bg-subtle);
      }
      .task-row--invalid {
        border-color: var(--danger-color);
      }
      .task-row__main {
        min-width: 0;
        display: grid;
        gap: 6px;
      }
      .task-row__title,
      .task-row__meta {
        min-width: 0;
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 6px 10px;
      }
      .task-row__title strong {
        min-width: 0;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--text-primary);
        font-size: 13px;
      }
      .task-row__badge {
        flex-shrink: 0;
        padding: 2px 7px;
        border-radius: 999px;
        background: var(--primary-50);
        color: var(--primary-700);
        font-size: 12px;
        font-weight: 600;
      }
      .task-row__meta,
      .task-row__desc {
        color: var(--text-muted);
        font-size: 12px;
      }
      .task-row__desc {
        display: -webkit-box;
        margin: 0;
        overflow: hidden;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        line-height: 1.6;
      }
      .task-row__actions {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .task-row__icon-btn {
        width: 32px;
        height: 32px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0;
      }
      .task-empty {
        padding: 14px;
        border-radius: 8px;
        background: var(--bg-subtle);
        color: var(--text-muted);
        font-size: 13px;
      }
      @media (max-width: 760px) {
        .task-row {
          grid-template-columns: 1fr;
        }
        .task-row__actions {
          justify-content: flex-end;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdEditStageTaskListComponent {
  readonly RD_STAGE_TASK_STATUS_LABELS = RD_STAGE_TASK_STATUS_LABELS;
  readonly drafts = input<RdEditStageTaskDraft[]>([]);
  readonly members = input<ProjectMemberEntity[]>([]);
  readonly canEdit = input(false);
  readonly add = output<void>();
  readonly edit = output<string>();
  readonly remove = output<string>();

  readonly memberNameById = computed(() => new Map(this.members().map((member) => [member.userId, member.displayName])));

  isDraftValid(draft: RdEditStageTaskDraft): boolean {
    return !!draft.title.trim() && draft.ownerIds.length > 0;
  }

  draftState(draft: RdEditStageTaskDraft): string {
    if (!draft.taskId) {
      return '新增';
    }
    if (!draft.original) {
      return '';
    }
    return this.isDraftChanged(draft) ? '已修改' : '';
  }

  ownerNames(ownerIds: string[]): string {
    const map = this.memberNameById();
    return ownerIds.map((id) => map.get(id) || id).filter(Boolean).join('、');
  }

  descriptionSummary(description: string): string {
    const text = description.replace(/[#>*_`\-[\]()]/g, '').replace(/\s+/g, ' ').trim();
    return text || '无描述';
  }

  formatDateRange(start: Date | null, end: Date | null): string {
    const startText = this.formatDate(start);
    const endText = this.formatDate(end);
    if (startText && endText) {
      return `${startText} ~ ${endText}`;
    }
    return startText || endText || '';
  }

  private isDraftChanged(draft: RdEditStageTaskDraft): boolean {
    const original = draft.original;
    if (!original) {
      return false;
    }
    return draft.title.trim() !== original.title ||
      (draft.description.trim() || null) !== (original.description ?? null) ||
      !this.sameStringArray(draft.ownerIds, original.ownerIds) ||
      this.formatDate(draft.plannedStartDate) !== (original.plannedStartAt ?? '') ||
      this.formatDate(draft.plannedEndDate) !== (original.plannedEndAt ?? '');
  }

  private sameStringArray(a: string[], b: string[]): boolean {
    if (a.length !== b.length) {
      return false;
    }
    return a.every((item, index) => item === b[index]);
  }

  private formatDate(value: Date | null): string {
    if (!value) {
      return '';
    }
    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, '0');
    const day = `${value.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
