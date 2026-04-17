import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';

import { RD_STATUS_LABELS } from '@shared/constants';
import type { RdItemEntity, RdStageEntity } from '../../models/rd.model';

@Component({
  selector: 'app-rd-flow-card',
  standalone: true,
  imports: [NzButtonModule, NzPopconfirmModule],
  template: `
    @if (item(); as current) {
      <section class="flow-card">
        <div class="flow-card__top">
          <div class="flow-card__meta">
            <span>当前阶段：{{ currentStageName() }}</span>
            <span class="flow-card__status">状态：{{ currentStatusName() }}</span>
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
        </div>
        <div class="flow-card__bottom">
          <div class="action-card">
            <div class="action-card__buttons">
              @if (canAdvance()) {
                <button nz-button nzType="primary" [disabled]="busy()" (click)="actionClick.emit('advance')">进入下一阶段</button>
              }
              @if (canEditBasic() && current.status !== 'closed') {
                <button nz-button  nzType="default" [disabled]="busy()" (click)="editClick.emit()">编辑</button>
              }
              @if (canClose()) {
                @if (current.status === 'closed') {
                  <button
                    nz-button
                    nzType="default"
                    [disabled]="busy()"
                    nz-popconfirm
                    nzPopconfirmTitle="确认恢复该研发项吗？"
                    nzPopconfirmPlacement="topRight"
                    (nzOnConfirm)="actionClick.emit('reopen')"
                  >
                    恢复
                  </button>
                } @else {
                  <button nz-button nzType="default" [disabled]="busy()" (click)="actionClick.emit('close')">
                    关闭
                  </button>
                }
              }
              @if (!canAdvance() && !canEditBasic() && !canClose()) {
                <span class="action-card__empty">当前状态无可执行操作</span>
              }
            </div>
          </div>
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
        border-radius: 12px;
        overflow: hidden;
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent 30%),
          var(--bg-container);
        box-shadow: 0 16px 36px rgba(15, 23, 42, 0.05);
      }
      .flow-card__top {
        padding: 14px 16px;
      }
      .flow-card__meta {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 10px;
        font-size: 12px;
        color: var(--text-muted);
      }
      .flow-card__status {
        color: var(--text-secondary);
        font-weight: 600;
      }
      .flow-card__bottom {
        border-top: 1px solid var(--border-color-soft);
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
      .action-card {
        padding: 16px 18px 18px;
      }
      .action-card__buttons {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
      }
      .action-card__empty {
        color: var(--text-muted);
        font-size: 13px;
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
        .flow-card__meta {
          flex-direction: column;
          align-items: flex-start;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdFlowCardComponent {
  readonly item = input<RdItemEntity | null>(null);
  readonly stages = input<RdStageEntity[]>([]);
  readonly busy = input(false);
  readonly canEditBasic = input(false);
  readonly canAdvance = input(false);
  readonly canClose = input(false);

  readonly actionClick = output<'advance' | 'close' | 'reopen'>();
  readonly editClick = output<void>();

  readonly statusFlow = computed<Array<{ id: string; label: string; state: 'done' | 'active' | 'pending' }>>(() => {
    const steps = [
      { id: 'todo', label: '待开始' },
      { id: 'doing', label: '进行中' },
      { id: 'done', label: '已完成' },
      { id: 'closed', label: '已关闭' },
    ] as const;
    const currentIndex = this.getStatusFlowIndex(this.item());
    return steps.map((step, index) => {
      if (currentIndex < 0) {
        return { ...step, state: 'pending' as const };
      }
      if (index < currentIndex) {
        return { ...step, state: 'done' as const };
      }
      if (index === currentIndex) {
        return { ...step, state: 'active' as const };
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

  private getStatusFlowIndex(item: RdItemEntity | null): number {
    if (!item) {
      return -1;
    }
    const progress = Number(item.progress) || 0;
    switch (item.status) {
      case 'todo':
        return progress > 0 ? 1 : 0;
      case 'doing':
      case 'blocked':
        return 1;
      case 'done':
      case 'accepted':
        return 2;
      case 'closed':
        return 3;
      default:
        if (progress >= 100) {
          return 2;
        }
        if (progress > 0) {
          return 1;
        }
        return 0;
    }
  }
}
