import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import { RD_STATUS_LABELS } from '@shared/constants';
import type { RdItemEntity, RdStageEntity } from '../../models/rd.model';

type FlowStepId = 'todo' | 'doing' | 'verify' | 'done' | 'closed';

@Component({
  selector: 'app-rd-flow-card',
  standalone: true,
  imports: [NzButtonModule, NzPopconfirmModule, NzTooltipModule],
  template: `
    @if (item(); as current) {
      <section class="flow-card">
        <div class="flow-card__top">
          <div class="flow-card__header">
            <div class="flow-card__meta">
              <span>当前阶段：{{ currentStageName() }}</span>
              <span class="flow-card__status">状态：{{ currentStatusName() }}</span>
            </div>
            @if (actionPlacement() === 'top-right' && hasActionButtons()) {
              <div class="flow-card__actions">
                @if (canAdvance()) {
                  <button
                    nz-button
                    nzType="primary"
                    class="flow-card__action-btn"
                    [disabled]="busy()"
                    nz-tooltip
                    nzTooltipTitle="推进到后续阶段，并可重新指定下一阶段执行人"
                    (click)="actionClick.emit('advance')"
                  >
                    进入下一阶段
                  </button>
                }
                @if (canAccept()) {
                  <button
                    nz-button
                    nzType="default"
                    class="flow-card__action-btn"
                    [disabled]="busy()"
                    nz-popconfirm
                    [nzPopconfirmTitle]="'确认该研发项' + currentStageName() + '阶段已完成吗？'"
                    nzPopconfirmPlacement="topRight"
                    nz-tooltip
                    nzTooltipTitle="当前阶段已完成，可进入下一阶段或结项"
                    (nzOnConfirm)="actionClick.emit('accept')"
                  >
                    标记已完成
                  </button>
                }
                @if (canEditBasic() && current.status !== 'closed') {
                  <button nz-button nzType="default" class="flow-card__action-btn" [disabled]="busy()" (click)="editClick.emit()">编辑</button>
                }
                @if (canClose()) {
                  @if (current.status === 'closed') {
                    <button
                      nz-button
                      nzType="default"
                      class="flow-card__action-btn"
                      [disabled]="busy()"
                      nz-popconfirm
                      [nzPopconfirmTitle]="'确认恢复该研发项吗？'"
                      nzPopconfirmPlacement="topRight"
                      (nzOnConfirm)="actionClick.emit('reopen')"
                    >
                      恢复
                    </button>
                  } @else {
                    <button
                      nz-button
                      nzType="default"
                      class="flow-card__action-btn"
                      [disabled]="busy()"
                      nz-tooltip
                      nzTooltipTitle="终止研发项，无法继续推进，关闭后可恢复"
                      (click)="actionClick.emit('close')"
                    >
                      关闭
                    </button>
                  }
                }
              </div>
            }
          </div>
          <div class="state-flow">
            @for (step of statusFlow(); track step.id; let last = $last) {
              <span
                class="state-flow__step"
                [class.is-done]="step.state === 'done'"
                [class.is-active]="step.state === 'active'"
              >
                {{ step.label }}
              </span>
              @if (!last) {
                <span class="state-flow__arrow" [class.is-done]="step.state !== 'pending'">›</span>
              }
            }
          </div>
          @if (actionPlacement() === 'below-flow' && hasActionButtons()) {
            <div class="flow-card__actions flow-card__actions--below">
              @if (canAdvance()) {
                <button
                  nz-button
                  nzType="primary"
                  class="flow-card__action-btn"
                  [disabled]="busy()"
                  nz-tooltip
                  nzTooltipTitle="推进到后续阶段，并可重新指定下一阶段执行人"
                  (click)="actionClick.emit('advance')"
                >
                  进入下一阶段
                </button>
              }
              @if (canAccept()) {
                <button
                  nz-button
                  nzType="default"
                  class="flow-card__action-btn"
                  [disabled]="busy()"
                  nz-popconfirm
                  [nzPopconfirmTitle]="'确认该研发项' + currentStageName() + '阶段已完成吗？'"
                  nzPopconfirmPlacement="topRight"
                  nz-tooltip
                  nzTooltipTitle="当前阶段已完成，可进入下一阶段或结项"
                  (nzOnConfirm)="actionClick.emit('accept')"
                >
                  标记已完成
                </button>
              }
              @if (canEditBasic() && current.status !== 'closed') {
                <button nz-button nzType="default" class="flow-card__action-btn" [disabled]="busy()" (click)="editClick.emit()">编辑</button>
              }
              @if (canClose()) {
                @if (current.status === 'closed') {
                  <button
                    nz-button
                    nzType="default"
                    class="flow-card__action-btn"
                    [disabled]="busy()"
                    nz-popconfirm
                    [nzPopconfirmTitle]="'确认恢复该研发项吗？'"
                    nzPopconfirmPlacement="topRight"
                    (nzOnConfirm)="actionClick.emit('reopen')"
                  >
                    恢复
                  </button>
                } @else {
                  <button
                    nz-button
                    nzType="default"
                    class="flow-card__action-btn"
                    [disabled]="busy()"
                    nz-tooltip
                    nzTooltipTitle="终止研发项，无法继续推进，关闭后可恢复"
                    (click)="actionClick.emit('close')"
                  >
                    关闭
                  </button>
                }
              }
            </div>
          }
        </div>
      </section>
    }
  `,
  styles: [
    `
      .flow-card {
        display: grid;
        gap: 0;
        border: 1px solid var(--border-color);
        border-radius: 24px;
        overflow: hidden;
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent 30%),
          var(--bg-container);
        box-shadow: 0 16px 36px rgba(15, 23, 42, 0.05);
      }
      .flow-card__top {
        padding: 22px 20px;
      }
      .flow-card__header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 10px;
      }
      .flow-card__meta {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
        font-size: 12px;
        color: var(--text-muted);
        width: 100%;
        justify-content: space-between;
      }
      .flow-card__status {
        color: var(--text-secondary);
        font-weight: 600;
      }
      .flow-card__actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        flex-wrap: wrap;
        gap: 8px;
      }
      .flow-card__actions--below {
        justify-content: flex-start;
        margin-top: 16px;
      }
      .flow-card__action-btn {
        min-width: 78px;
      }
      .state-flow {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        gap: 6px;
        flex-wrap: nowrap;
        width: 100%;
        min-width: 0;
        overflow-x: auto;
        overflow-y: hidden;
        padding-bottom: 2px;
        scrollbar-width: thin;
      }
      .state-flow__step {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 auto;
        min-width: 64px;
        height: 30px;
        padding: 0 10px;
        border-radius: 999px;
        background: var(--bg-subtle);
        border: 1px solid transparent;
        color: var(--text-muted);
        font-size: 12px;
        font-weight: 600;
        transition:
          background-color 160ms ease,
          border-color 160ms ease,
          color 160ms ease,
          box-shadow 160ms ease,
          transform 160ms ease;
      }
      .state-flow__step.is-done {
        background: rgba(99, 102, 241, 0.08);
        border-color: rgba(99, 102, 241, 0.18);
        color: rgba(79, 70, 229, 0.88);
      }
      .state-flow__step.is-active {
        background: var(--primary-600);
        border-color: var(--primary-600);
        color: #fff;
        font-weight: 700;
        box-shadow: 0 10px 24px rgba(79, 70, 229, 0.28);
        transform: translateY(-1px);
      }
      .state-flow__arrow {
        flex: 0 0 auto;
        color: var(--gray-300);
        font-size: 13px;
      }
      .state-flow__arrow.is-done {
        color: rgba(99, 102, 241, 0.5);
      }
      .state-flow::-webkit-scrollbar {
        height: 6px;
      }
      .state-flow::-webkit-scrollbar-thumb {
        background: rgba(148, 163, 184, 0.35);
        border-radius: 999px;
      }
      :host-context(html[data-theme='dark']) .flow-card {
        border-color: rgba(148, 163, 184, 0.14);
      }
      :host-context(html[data-theme='dark']) .state-flow__step.is-done {
        background: rgba(99, 102, 241, 0.14);
        border-color: rgba(129, 140, 248, 0.26);
        color: #c7d2fe;
      }
      :host-context(html[data-theme='dark']) .state-flow__step.is-active {
        box-shadow: 0 12px 28px rgba(99, 102, 241, 0.32);
      }
      :host-context(html[data-theme='dark']) .state-flow__arrow.is-done {
        color: rgba(165, 180, 252, 0.55);
      }
      @media (max-width: 720px) {
        .flow-card__header {
          flex-direction: column;
          align-items: flex-start;
        }
        .flow-card__actions {
          justify-content: flex-start;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdFlowCardComponent {
  readonly actionPlacement = input<'top-right' | 'below-flow'>('top-right');
  readonly item = input<RdItemEntity | null>(null);
  readonly stages = input<RdStageEntity[]>([]);
  readonly busy = input(false);
  readonly canEditBasic = input(false);
  readonly canAdvance = input(false);
  readonly canAccept = input(false);
  readonly canClose = input(false);

  readonly actionClick = output<'advance' | 'accept' | 'close' | 'reopen'>();
  readonly editClick = output<void>();
  readonly hasActionButtons = computed(() => {
    const current = this.item();
    if (!current) {
      return false;
    }
    if (this.canAdvance() || this.canAccept() || this.canClose()) {
      return true;
    }
    return this.canEditBasic() && current.status !== 'closed';
  });

  readonly statusFlow = computed<Array<{ id: string; label: string; state: 'done' | 'active' | 'pending' }>>(() => {
    const item = this.item();
    const isClosedFlow = item?.status === 'closed';
    const steps: Array<{ id: FlowStepId; label: string }> = isClosedFlow
      ? [
          { id: 'todo', label: '待开始' },
          { id: 'doing', label: '进行中' },
          { id: 'verify', label: '待确认' },
          { id: 'closed', label: '已关闭' },
        ]
      : [
          { id: 'todo', label: '待开始' },
          { id: 'doing', label: '进行中' },
          { id: 'verify', label: '待确认' },
          { id: 'done', label: '已完成' },
        ];
    if (!item) {
      return steps.map((step) => ({ ...step, state: 'pending' as const }));
    }

    const progress = Math.max(0, Math.min(100, Number(item.progress) || 0));
    const activeId = this.getActiveStatusId(item.status, progress);

    return steps.map((step) => {
      if (step.id === activeId) {
        return { ...step, state: 'active' as const };
      }
      if (this.isReachedStatus(step.id, item.status, progress)) {
        return { ...step, state: 'done' as const };
      }
      return { ...step, state: 'pending' as const };
    });
  });

  readonly currentStageName = computed(() => {
    const current = this.item();
    if (!current) {
      return '-';
    }
    return this.stages().find((stage) => stage.id === current.stageId)?.name ?? '-';
  });

  readonly currentStatusName = computed(() => {
    const status = this.item()?.status;
    if (!status) {
      return '-';
    }
    if (status === 'blocked') {
      return '处理中（阻塞中）';
    }
    if (status === 'closed') {
      return '已关闭';
    }
    return RD_STATUS_LABELS[status] ?? status;
  });

  private getActiveStatusId(
    status: RdItemEntity['status'],
    progress: number
  ): FlowStepId {
    if (status === 'closed') {
      return 'closed';
    }
    if (status === 'accepted') {
      return 'done';
    }
    if (status === 'done' || progress >= 100) {
      return 'verify';
    }
    if (status === 'doing' || status === 'blocked' || progress > 0) {
      return 'doing';
    }
    return 'todo';
  }

  private isReachedStatus(
    target: FlowStepId,
    status: RdItemEntity['status'],
    progress: number
  ): boolean {
    if (target === 'todo') {
      return true;
    }
    if (target === 'doing') {
      return status === 'doing' || status === 'blocked' || status === 'done' || status === 'accepted' || progress > 0;
    }
    if (target === 'verify') {
      return status === 'done' || status === 'accepted' || progress >= 100;
    }
    if (target === 'done') {
      return status === 'accepted';
    }
    if (target === 'closed') {
      return false;
    }
    return false;
  }
}
