import { ChangeDetectionStrategy, Component, computed, effect, input, output, Signal, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSliderModule } from 'ng-zorro-antd/slider';

import { PanelCardComponent } from '../../../../shared/ui/panel-card/panel-card.component';
import type { RdItemEntity, RdLogEntity, RdStageEntity } from '../../models/rd.model';
import { RdActivityTimelineComponent } from '../rd-activity-timeline/rd-activity-timeline.component';
import { RdPropsPanelComponent } from '../rd-props-panel/rd-props-panel.component';

@Component({
  selector: 'app-rd-detail-drawer',
  standalone: true,
  imports: [
    FormsModule,
    NzDrawerModule,
    NzIconModule,
    NzInputModule,
    NzPopconfirmModule,
    NzButtonModule,
    NzSliderModule,
    PanelCardComponent,
    RdPropsPanelComponent,
    RdActivityTimelineComponent,
  ],
  template: `
    <nz-drawer
      [nzVisible]="open()"
      [nzClosable]="false"
      [nzMaskClosable]="true"
      [nzWidth]="640"
      [nzWrapClassName]="'rd-detail-drawer'"
      [nzBodyStyle]="drawerBodyStyle"
      [nzMask]="false"
      [nzTitle]="drawerTitleTpl"
      (nzOnClose)="close.emit()"
    >
      <ng-template #drawerTitleTpl>
        <div class="detail-drawer__title">
          <div class="detail-drawer__title-main">
            @if (subtitleText(); as subtitle) {
              <span class="detail-drawer__subtitle">{{ subtitle }}</span>
            }
            <strong>{{ titleText() }}</strong>
          </div>
          <button type="button" class="detail-drawer__close" (click)="close.emit()">
            <span nz-icon nzType="close"></span>
          </button>
        </div>
      </ng-template>

      <ng-template nzDrawerContent>
        @if (item(); as current) {
          <div class="detail-stack">
            <app-panel-card title="研发项描述">
               @if (canEditBasic()) {
                <ng-container panel-actions>
                  <button nz-button nzType="default" [disabled]="busy()" (click)="startBasicEdit()">编辑</button>
                </ng-container>
              }
              <div class="summary-card">
                @if (editingBasic()) {
                  <div class="summary-card__edit">
                    <input nz-input [ngModel]="basicTitleDraft()" (ngModelChange)="basicTitleDraft.set($event)" maxlength="120" />
                    <textarea
                      nz-input
                      rows="5"
                      [ngModel]="basicDescriptionDraft()"
                      (ngModelChange)="basicDescriptionDraft.set($event)"
                      placeholder="请输入描述"
                    ></textarea>
                    <div class="summary-card__edit-actions">
                      <button nz-button nzType="default" [disabled]="busy()" (click)="cancelBasicEdit()">取消</button>
                      <button nz-button nzType="primary" [disabled]="busy() || !basicDirty()" (click)="saveBasic()">保存</button>
                    </div>
                  </div>
                } @else {
                  <p>{{ current.description || '暂无描述' }}</p>
                 
                }
              </div>
            </app-panel-card>

            <app-panel-card title="操作">
              <div class="action-card">
                <div class="action-card__buttons">
                  @for (action of actionButtons(); track action.key) {
                    @if (action.confirm) {
                        <button
                      nz-button
                      [nzType]="action.primary ? 'primary' : 'default'"
                      [disabled]="busy()"
                      nz-popconfirm
                      [nzPopconfirmTitle]="action.confirm.title"
                      [nzPopconfirmPlacement]="action.confirm.placement"
                      (nzOnConfirm)="actionClick.emit(action.key)"
                    >
                      {{ action.label }}
                    </button>
                    }@else {<button
                      nz-button
                      [nzType]="action.primary ? 'primary' : 'default'"
                      [disabled]="busy()"
                      (click)="actionClick.emit(action.key)"
                    >
                      {{ action.label }}
                    </button>}
                    
                  }
                  @if (actionButtons().length === 0) {
                    <span class="action-card__empty">当前状态无可执行操作</span>
                  }
                </div>
                @if (canDelete()) {
                  <div class="action-card__danger">
                    <button
                      nz-button
                      nzType="default"
                      nzDanger
                      [disabled]="busy()"
                      nz-popconfirm
                      nzPopconfirmTitle="确认删除该研发项吗？删除后无法恢复。"
                      nzPopconfirmPlacement="topRight"
                      (nzOnConfirm)="deleteClick.emit()"
                    >
                      删除研发项
                    </button>
                  </div>
                }

                @if (allowProgressEdit()) {
                  <div class="action-card__progress">
                    <div class="action-card__progress-head">
                      <span>进度调节</span>
                      <strong>{{ progressDraft() }}%</strong>
                    </div>
                    <nz-slider
                      [nzMin]="0"
                      [nzMax]="100"
                      [nzStep]="5"
                      [nzDisabled]="busy()"
                      [ngModel]="progressDraft()"
                      (ngModelChange)="updateProgressDraft($event)"
                    ></nz-slider>
                    <div class="action-card__progress-actions">
                      <button
                        nz-button
                        nzType="default"
                        [disabled]="busy() || !progressDirty()"
                        (click)="resetProgress()"
                      >
                        重置
                      </button>
                      <button
                        nz-button
                        nzType="primary"
                        [disabled]="busy() || !progressDirty()"
                        nz-popconfirm
                        nzPopconfirmTitle="确认保存该研发项进度吗？"
                        nzPopconfirmPlacement="topRight"
                        (nzOnConfirm)="saveProgress()"
                      >
                        保存进度
                      </button>
                    </div>
                  </div>
                }
              </div>
            </app-panel-card>

            <app-rd-props-panel [item]="current" [stages]="stages()" />
            <app-rd-activity-timeline [item]="current" [logs]="logs()" />
          </div>
        }
      </ng-template>
    </nz-drawer>
  `,
  styles: [
    `
      .detail-drawer__title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .detail-drawer__title-main {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 6px;
        min-width: 0;
      }
      .detail-drawer__title-main strong {
        color: var(--text-primary);
        font-size: 18px;
        line-height: 1.2;
      }
      .detail-drawer__subtitle {
        color: var(--text-muted);
        font-size: 12px;
        line-height: 1.4;
        background: var(--gray-100);
        padding: 3px 8px;
        border-radius: 4px;
        white-space: nowrap;
      }
      .detail-drawer__close {
        width: 36px;
        height: 36px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 0;
        background: transparent;
        color: var(--text-muted);
        cursor: pointer;
        border-radius: 999px;
        transition: var(--transition-base);
      }
      .detail-drawer__close:hover {
        background: var(--bg-subtle);
        color: var(--text-primary);
      }
      .detail-stack {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .action-card {
        padding: 16px 18px 18px;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .action-card__buttons {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 10px;
      }
      .action-card__empty {
        color: var(--text-muted);
        font-size: 13px;
      }
      .action-card__danger {
        display: flex;
        justify-content: flex-end;
      }
      .action-card__progress {
        border-top: 1px solid var(--border-color-soft);
        padding-top: 14px;
      }
      .action-card__progress-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;
      }
      .action-card__progress-head span {
        color: var(--text-secondary);
        font-size: 13px;
      }
      .action-card__progress-head strong {
        color: var(--text-heading);
        font-size: 14px;
      }
      .action-card__progress-actions {
        margin-top: 12px;
        display: flex;
        justify-content: flex-end;
        gap: 10px;
      }
      .summary-card {
        padding: 20px;
      }
      .summary-card__code {
        color: var(--text-muted);
        font-size: 12px;
        font-family: 'JetBrains Mono', monospace;
      }
      .summary-card h3 {
        margin: 10px 0 8px;
        color: var(--text-heading);
        font-size: 18px;
        line-height: 1.4;
      }
      .summary-card p {
        margin: 0;
        color: var(--text-secondary);
        line-height: 1.7;
        white-space: pre-wrap;
      }
      .summary-card__view-actions {
        margin-top: 12px;
      }
      .summary-card__edit {
        display: grid;
        gap: 10px;
      }
      .summary-card__edit textarea {
        resize: vertical;
      }
      .summary-card__edit-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdDetailDrawerComponent {
  readonly busy = input(false);
  readonly open = input(false);
  readonly item = input<RdItemEntity | null>(null);
  readonly logs = input<RdLogEntity[]>([]);
  readonly stages = input<RdStageEntity[]>([]);
  readonly canBlock = input(false);
  readonly canEditProgress = input(false);
  readonly canEditBasic = input(false);
  readonly canStart = input(false);
  readonly canResume = input(false);
  readonly canComplete = input(false);
  readonly canAdvance = input(false);
  readonly canDelete = input(false);
  readonly actionClick = output<'start' | 'block' | 'resume' | 'complete' | 'advance'>();
  readonly deleteClick = output<void>();
  readonly progressChange = output<number>();
  readonly basicSave = output<{ title: string; description: string | null }>();
  readonly close = output<void>();
  readonly progressDraft = signal(0);
  readonly editingBasic = signal(false);
  readonly basicTitleDraft = signal('');
  readonly basicDescriptionDraft = signal('');
  readonly basicDirty = computed(() => {
    const current = this.item();
    if (!current) {
      return false;
    }
    const nextTitle = this.basicTitleDraft().trim();
    const nextDescription = this.normalizeDescription(this.basicDescriptionDraft());
    return nextTitle !== current.title || nextDescription !== current.description;
  });
  readonly progressDirty = computed(() => this.progressDraft() !== (this.item()?.progress ?? 0));

  readonly drawerBodyStyle = { padding: '18px 20px 24px', overflow: 'auto' };
  readonly titleText = computed(() => this.item()?.title || '研发项详情');
  readonly subtitleText = computed(() => this.item()?.rdNo || '');
  readonly actionButtons: Signal<ActionButton[]> = computed(() => {
    const current = this.item();
    if (!current) {
      return [];
    }
    switch (current.status) {
      case 'todo':
        return this.canStart() ? [{ key: 'start' as const, label: '开始', primary: true }] : [];
      case 'doing':
        if (this.canBlock() && this.canComplete()) {
          return [
            { key: 'block' as const, label: '阻塞', primary: false },
            { key: 'complete' as const, label: '完成', primary: true, confirm: { title: '确认完成该研发项吗？', placement: 'topRight' } },
          ];
        }
        if (this.canBlock()) {
          return [{ key: 'block' as const, label: '阻塞', primary: false }];
        }
        return this.canComplete() ? [{ key: 'complete' as const, label: '完成', primary: true, confirm: { title: '确认完成该研发项吗？', placement: 'topRight' } }] : [];
      case 'blocked':
        return this.canResume() ? [{ key: 'resume' as const, label: '继续', primary: true, confirm: { title: '确认继续该研发项吗？', placement: 'topRight' } }] : [];
      case 'done':
        return this.canAdvance() ? [{ key: 'advance' as const, label: '进入下一阶段', primary: true }] : [];
      case 'accepted':
        return this.canAdvance() ? [{ key: 'advance' as const, label: '进入下一阶段', primary: true }] : [];
      default:
        return [];
    }
  });
  readonly allowProgressEdit = computed(() => {
    const status = this.item()?.status;
    return this.canEditProgress() && !!status && status !== 'closed';
  });

  constructor() {
    effect(() => {
      this.progressDraft.set(this.item()?.progress ?? 0);
    });

    effect(() => {
      const current = this.item();
      if (!current) {
        this.editingBasic.set(false);
        this.basicTitleDraft.set('');
        this.basicDescriptionDraft.set('');
        return;
      }
      this.basicTitleDraft.set(current.title);
      this.basicDescriptionDraft.set(current.description ?? '');
    });
  }

  updateProgressDraft(value: number): void {
    this.progressDraft.set(Math.max(0, Math.min(100, Number(value ?? 0))));
  }

  resetProgress(): void {
    this.progressDraft.set(this.item()?.progress ?? 0);
  }

  saveProgress(): void {
    if (!this.progressDirty() || this.busy()) {
      return;
    }
    this.progressChange.emit(this.progressDraft());
  }

  startBasicEdit(): void {
    if (!this.canEditBasic()) {
      return;
    }
    this.editingBasic.set(true);
  }

  cancelBasicEdit(): void {
    const current = this.item();
    this.basicTitleDraft.set(current?.title ?? '');
    this.basicDescriptionDraft.set(current?.description ?? '');
    this.editingBasic.set(false);
  }

  saveBasic(): void {
    if (!this.canEditBasic() || this.busy() || !this.basicDirty()) {
      return;
    }
    const title = this.basicTitleDraft().trim();
    if (!title) {
      return;
    }
    this.basicSave.emit({
      title,
      description: this.normalizeDescription(this.basicDescriptionDraft()),
    });
    this.editingBasic.set(false);
  }

  private normalizeDescription(value: string): string | null {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
}

interface ActionButton {
  key: 'start' | 'block' | 'resume' | 'complete' | 'advance';
  label: string;
  primary?: boolean;
  confirm?: { title: string; placement: 'top' | 'topLeft' | 'topRight' | 'left' | 'right' | 'bottom' | 'bottomLeft' | 'bottomRight' };
}