import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';

import { PanelCardComponent } from '@shared/ui';
import type { ProjectMemberEntity } from '../../../projects/models/project.model';
import { RdStageTaskCreateDialogComponent } from '../../dialogs/rd-stage-task-create-dialog/rd-stage-task-create-dialog.component';
import {
  RD_STAGE_TASK_STATUS_LABELS,
  type RdStageEntity,
  type RdStageTaskEntity,
  type RdStageTaskStatus,
  type RdStageTaskTemplateEntity,
  resolveRdStageKey,
  resolveRdStageName,
} from '../../models/rd.model';

type StageTaskGroup = {
  stageKey: string;
  stageName: string;
  tasks: RdStageTaskEntity[];
  total: number;
  done: number;
  progress: number;
};

@Component({
  selector: 'app-rd-stage-tasks-panel',
  standalone: true,
  imports: [
    NgTemplateOutlet,
    PanelCardComponent,
    NzButtonModule,
    NzPopconfirmModule,
    RdStageTaskCreateDialogComponent,
  ],
  template: `
    @if (showList()) {
      <ng-template #stageTaskBody>
        <div class="stage-task-panel">
          @if (groups().length === 0 && canEdit()) {
            <div class="stage-task-inline-empty">暂无阶段任务，可新增临时任务。</div>
          }

          <div class="stage-task-groups">
            @for (group of groups(); track group.stageKey) {
              <section class="stage-task-group">
                <header class="stage-task-group__header">
                  <div class="stage-task-group__title">
                    <strong>{{ group.stageName }}</strong>
                    <span>{{ group.done }}/{{ group.total }} 已完成</span>
                  </div>
                  <div class="stage-task-group__progress">
                    <div class="stage-task-group__bar">
                      <span [style.width.%]="group.progress"></span>
                    </div>
                    <b>{{ group.progress }}%</b>
                  </div>
                </header>

                <div class="stage-task-list">
                  @for (task of group.tasks; track task.id) {
                    <article
                      class="stage-task"
                      [class.stage-task--done]="task.status === 'done'"
                      [class.stage-task--blocked]="task.status === 'blocked'"
                      [class.stage-task--cancelled]="task.status === 'cancelled'"
                    >
                      <div class="stage-task__main">
                        <div class="stage-task__text">
                          <strong>{{ task.title }}</strong>
                          @if (task.description) {
                            <span>{{ task.description }}</span>
                          }
                        </div>
                        <div class="stage-task__meta">
                          <span class="stage-task__status">{{ statusLabel(task.status) }}</span>
                          @if (taskOwnerText(task); as ownerText) {
                            <span>{{ ownerText }}</span>
                          }
                          @if (formatDateRange(task.plannedStartAt, task.plannedEndAt); as range) {
                            <span>计划 {{ range }}</span>
                          }
                          <span>{{ task.progress }}%</span>
                        </div>
                      </div>
                      @if (canEdit() && task.status !== 'cancelled') {
                        <div class="stage-task__actions">
                          @if (task.status !== 'in_progress' && task.status !== 'done') {
                            <button nz-button nzSize="small" type="button" (click)="updateTask.emit({ taskId: task.id, status: 'in_progress' })">
                              开始
                            </button>
                          }
                          @if (task.status !== 'done') {
                            <button nz-button nzType="primary" nzSize="small" type="button" (click)="updateTask.emit({ taskId: task.id, status: 'done' })">
                              完成
                            </button>
                          }
                          @if (task.status !== 'blocked' && task.status !== 'done') {
                            <button nz-button nzDanger nzSize="small" type="button" (click)="updateTask.emit({ taskId: task.id, status: 'blocked' })">
                              阻塞
                            </button>
                          }
                          <button
                            nz-button
                            nzSize="small"
                            type="button"
                            nz-popconfirm
                            nzPopconfirmTitle="确认取消该阶段任务吗？"
                            nzPopconfirmPlacement="topRight"
                            (nzOnConfirm)="cancelTask.emit({ taskId: task.id })"
                          >
                            取消
                          </button>
                        </div>
                      }
                    </article>
                  }
                </div>
              </section>
            }
          </div>
        </div>
      </ng-template>

      @if (embedded()) {
        <section class="stage-task-embedded">
          <header class="stage-task-embedded__header">
            <div>
              <strong>研发阶段任务</strong>
              <span>任务状态与成员进度独立维护。</span>
            </div>
            @if (canEdit() && showCreateButton()) {
              <button
                nz-button
                nzType="primary"
                nzSize="small"
                type="button"
                [disabled]="!canOpenCreateDialog()"
                (click)="openCreateDialog()"
              >
                新增阶段任务
              </button>
            }
          </header>
          <ng-container *ngTemplateOutlet="stageTaskBody"></ng-container>
        </section>
      } @else {
        <app-panel-card title="研发阶段任务" [empty]="groups().length === 0 && !canEdit()" [emptyText]="'暂无阶段任务'">
          @if (canEdit() && showCreateButton()) {
            <button
              panel-actions
              nz-button
              nzType="primary"
              nzSize="small"
              type="button"
              [disabled]="!canOpenCreateDialog()"
              (click)="openCreateDialog()"
            >
              新增阶段任务
            </button>
          }
          <ng-container *ngTemplateOutlet="stageTaskBody"></ng-container>
        </app-panel-card>
      }
    }

    <app-rd-stage-task-create-dialog
      [open]="createDialogOpen()"
      [stages]="stages()"
      [members]="members()"
      [memberIds]="memberIds()"
      [currentStageId]="currentStageId()"
      [planStartAt]="planStartAt()"
      [planEndAt]="planEndAt()"
      [stageTaskTemplates]="stageTaskTemplates()"
      (createTasks)="handleCreateTasks($event)"
      (cancel)="closeCreateDialog()"
    />
  `,
  styles: [
    `
      .stage-task-panel {
        display: flex;
        flex-direction: column;
        gap: 14px;
        padding: 16px 20px 18px;
      }
      .stage-task-embedded {
        margin: 2px 20px 18px;
        border-top: 1px solid var(--border-color-soft);
        padding-top: 14px;
      }
      .stage-task-embedded__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 12px;
      }
      .stage-task-embedded__header div {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .stage-task-embedded__header strong {
        color: var(--text-heading);
        font-size: 14px;
      }
      .stage-task-embedded__header span {
        color: var(--text-muted);
        font-size: 12px;
      }
      .stage-task-embedded .stage-task-panel {
        padding: 0;
      }
      .stage-task-inline-empty {
        color: var(--text-muted);
        font-size: 13px;
        padding: 2px 0;
      }
      .stage-task-groups {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .stage-task-group {
        border: 1px solid var(--border-color-soft);
        border-radius: 8px;
        overflow: hidden;
      }
      .stage-task-group__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: var(--bg-subtle);
      }
      .stage-task-group__title {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }
      .stage-task-group__title strong {
        color: var(--text-heading);
        font-size: 14px;
      }
      .stage-task-group__title span,
      .stage-task__text span,
      .stage-task__meta {
        color: var(--text-muted);
        font-size: 12px;
      }
      .stage-task-group__progress {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 0 0 170px;
      }
      .stage-task-group__bar {
        width: 120px;
        height: 7px;
        border-radius: 999px;
        overflow: hidden;
        background: var(--gray-100);
      }
      .stage-task-group__bar span {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: var(--primary);
      }
      .stage-task-group__progress b {
        min-width: 36px;
        color: var(--text-heading);
        font-size: 12px;
        text-align: right;
      }
      .stage-task-list {
        display: flex;
        flex-direction: column;
      }
      .stage-task {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 12px;
        border-top: 1px solid var(--border-color-soft);
      }
      .stage-task__main {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .stage-task__text {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .stage-task__text strong {
        color: var(--text-primary);
        font-size: 13px;
        line-height: 1.4;
      }
      .stage-task__meta {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }
      .stage-task__status {
        color: var(--primary-700);
        font-weight: 700;
      }
      .stage-task__actions {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;
      }
      .stage-task--done .stage-task__status {
        color: var(--success);
      }
      .stage-task--blocked .stage-task__status {
        color: var(--warning);
      }
      .stage-task--cancelled {
        opacity: 0.62;
      }
      @media (max-width: 760px) {
        .stage-task-embedded__header {
          align-items: stretch;
          flex-direction: column;
        }
        .stage-task,
        .stage-task-group__header {
          align-items: stretch;
          flex-direction: column;
        }
        .stage-task-group__progress {
          flex: none;
          width: 100%;
        }
        .stage-task-group__bar {
          flex: 1;
          width: auto;
        }
        .stage-task__actions {
          flex-wrap: wrap;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdStageTasksPanelComponent {
  readonly stages = input<RdStageEntity[]>([]);
  readonly tasks = input<RdStageTaskEntity[]>([]);
  readonly members = input<ProjectMemberEntity[]>([]);
  readonly memberIds = input<string[]>([]);
  readonly currentStageId = input<string | null>(null);
  readonly planStartAt = input<string | null>(null);
  readonly planEndAt = input<string | null>(null);
  readonly stageTaskTemplates = input<RdStageTaskTemplateEntity[]>([]);
  readonly canEdit = input(false);
  readonly embedded = input(false);
  readonly showCreateButton = input(true);
  readonly showList = input(true);
  readonly createDialogOpenRequest = input(0);

  readonly createTasks = output<{
    tasks: Array<{
      stageKey: string;
      title: string;
      description?: string | null;
      ownerIds: string[];
      plannedStartAt?: string | null;
      plannedEndAt?: string | null;
    }>;
  }>();
  readonly updateTask = output<{ taskId: string; status: RdStageTaskStatus }>();
  readonly cancelTask = output<{ taskId: string }>();

  readonly createDialogOpen = signal(false);

  readonly stageOptions = computed(() => {
    const mapped = this.stages()
      .filter((stage) => stage.enabled)
      .sort((a, b) => a.sort - b.sort)
      .map((stage) => ({ key: resolveRdStageKey(stage), name: stage.name }));
    const seen = new Set<string>();
    return mapped.filter((stage) => {
      if (seen.has(stage.key)) {
        return false;
      }
      seen.add(stage.key);
      return true;
    });
  });

  readonly groups = computed<StageTaskGroup[]>(() => {
    const stageNameByKey = new Map(this.stageOptions().map((stage) => [stage.key, stage.name]));
    const orderByKey = new Map(this.stageOptions().map((stage, index) => [stage.key, index]));
    const buckets = new Map<string, RdStageTaskEntity[]>();
    for (const task of this.tasks()) {
      const list = buckets.get(task.stageKey) ?? [];
      list.push(task);
      buckets.set(task.stageKey, list);
    }
    return Array.from(buckets.entries())
      .sort((left, right) => (orderByKey.get(left[0]) ?? 999) - (orderByKey.get(right[0]) ?? 999))
      .map(([stageKey, tasks]) => {
        const sortedTasks = [...tasks].sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
        const activeTasks = sortedTasks.filter((task) => task.status !== 'cancelled');
        const done = activeTasks.filter((task) => task.status === 'done').length;
        const total = activeTasks.length;
        return {
          stageKey,
          stageName: stageNameByKey.get(stageKey) ?? resolveRdStageName(stageKey),
          tasks: sortedTasks,
          total,
          done,
          progress: total > 0 ? Math.round((done / total) * 100) : 0,
        };
      });
  });

  readonly currentStage = computed(() => {
    const stageId = this.currentStageId()?.trim();
    if (!stageId) {
      return null;
    }
    return this.stages().find((stage) => stage.id === stageId) ?? null;
  });

  readonly currentStageKey = computed(() => {
    const stage = this.currentStage();
    return stage && stage.enabled ? resolveRdStageKey(stage) : '';
  });

  constructor() {
    let lastOpenRequest = this.createDialogOpenRequest();
    effect(() => {
      const request = this.createDialogOpenRequest();
      if (request === lastOpenRequest) {
        return;
      }
      lastOpenRequest = request;
      this.openCreateDialog();
    });
  }

  canOpenCreateDialog(): boolean {
    return !!this.currentStageKey();
  }

  statusLabel(status: RdStageTaskStatus): string {
    return RD_STAGE_TASK_STATUS_LABELS[status] ?? status;
  }

  taskOwnerText(task: RdStageTaskEntity): string {
    const names = task.ownerNames?.length
      ? task.ownerNames
      : task.ownerName
        ? [task.ownerName]
        : task.ownerId
          ? [task.ownerId]
          : [];
    return names.filter(Boolean).join('、');
  }

  formatDateRange(startAt: string | null, endAt: string | null): string {
    const start = this.formatDate(startAt);
    const end = this.formatDate(endAt);
    if (start && end) {
      return `${start} 至 ${end}`;
    }
    return start || end || '';
  }

  openCreateDialog(): void {
    if (!this.canOpenCreateDialog()) {
      return;
    }
    this.createDialogOpen.set(true);
  }

  closeCreateDialog(): void {
    this.createDialogOpen.set(false);
  }

  handleCreateTasks(event: {
    tasks: Array<{
      stageKey: string;
      title: string;
      description?: string | null;
      ownerIds: string[];
      plannedStartAt?: string | null;
      plannedEndAt?: string | null;
    }>;
  }): void {
    this.createTasks.emit(event);
    this.createDialogOpen.set(false);
  }

  private formatDate(value: unknown): string | undefined {
    const date = this.normalizeDate(value);
    if (!date) {
      return undefined;
    }
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private normalizeDate(value: unknown): Date | null {
    if (!value) {
      return null;
    }
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }
    if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate: unknown }).toDate === 'function') {
      const date = (value as { toDate: () => Date }).toDate();
      return Number.isNaN(date.getTime()) ? null : date;
    }
    if (typeof value === 'string' || typeof value === 'number') {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
  }

}
