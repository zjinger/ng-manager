import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';

import { MarkdownEditorComponent, MarkdownViewerComponent, PanelCardComponent } from '@shared/ui';
import type { RdItemEntity, RdLogEntity, RdStageEntity, RdStageHistoryEntry } from '../../models/rd.model';
import { RdActivityTimelineComponent } from '../rd-activity-timeline/rd-activity-timeline.component';
import { RdFlowCardComponent } from '../rd-flow-card/rd-flow-card.component';
import { RdPropsPanelComponent } from '../rd-props-panel/rd-props-panel.component';
import type { MemberProgressItem } from '../rd-progress-panel/rd-progress-panel.component';
import { RdStageHistoryPanelComponent } from '../rd-stage-history-panel/rd-stage-history-panel.component';

@Component({
  selector: 'app-rd-detail-content',
  standalone: true,
  imports: [
    FormsModule,
    NzInputModule,
    NzButtonModule,
    PanelCardComponent,
    RdPropsPanelComponent,
    RdActivityTimelineComponent,
    RdFlowCardComponent,
    RdStageHistoryPanelComponent,
    MarkdownViewerComponent,
    MarkdownEditorComponent,
  ],
  template: `
    @if (item(); as current) {
      <div class="detail-stack">
        @if (showSummary()) {
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
                <app-markdown-editor
                  [ngModel]="basicDescriptionDraft()"
                  (ngModelChange)="basicDescriptionDraft.set($event)"
                  [minHeight]="'200px'"
                  [placeholder]="'请输入描述（支持 Markdown 格式）'"
                ></app-markdown-editor>
                <div class="summary-card__edit-actions">
                  <button nz-button nzType="default" [disabled]="busy()" (click)="cancelBasicEdit()">取消</button>
                  <button nz-button nzType="primary" [disabled]="busy() || !basicDirty()" (click)="saveBasic()">保存</button>
                </div>
              </div>
            } @else {
              @if (current.description) {
                <div class="summary-card__viewer">
                  <app-markdown-viewer
                    [content]="current.description"
                    [showToc]="true"
                    [tocVariant]="'floating'"
                    [tocCollapsedByDefault]="true"
                  ></app-markdown-viewer>
                </div>
              } @else {
                <p class="empty-hint">暂无描述</p>
              }
            }
          </div>
          </app-panel-card>
        }

        @if (showAction()) {
          <app-rd-flow-card
            [item]="current"
            [stages]="stages()"
            [busy]="busy()"
            [canEditBasic]="canEditBasic()"
            [canAdvance]="canAdvance()"
            [canClose]="canClose()"
            (actionClick)="actionClick.emit($event)"
            (editClick)="handleEditClick()"
          />
        }

        @if (showProps()) {
          <app-rd-props-panel [item]="current" [stages]="stages()" [memberNames]="memberDisplayNames()" />
        }
        @if (showActivity()) {
          <app-rd-activity-timeline [item]="current" [logs]="logs()" />
        }
        @if (showStageHistory()) {
          <app-rd-stage-history-panel [entries]="stageHistory()"></app-rd-stage-history-panel>
        }
      </div>
    }
  `,
  styles: [
    `
      .detail-stack {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .summary-card {
        padding: 20px;
      }
      .summary-card p {
        margin: 0;
        color: var(--text-secondary);
        line-height: 1.7;
        white-space: pre-wrap;
      }
      .summary-card__viewer {
        max-height: 420px;
        overflow: auto;
        padding-right: 4px;
      }
      .summary-card .empty-hint {
        color: var(--text-muted);
        font-size: 13px;
      }
      .summary-card__edit {
        display: grid;
        gap: 10px;
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
export class RdDetailContentComponent {
  private handledExternalEditToken = -1;
  readonly busy = input(false);
  readonly item = input<RdItemEntity | null>(null);
  readonly logs = input<RdLogEntity[]>([]);
  readonly stages = input<RdStageEntity[]>([]);
  readonly memberProgressList = input<MemberProgressItem[]>([]);
  readonly canEditBasic = input(false);
  readonly canAdvance = input(false);
  readonly canClose = input(false);
  readonly showSummary = input(true);
  readonly showAction = input(true);
  readonly showProps = input(true);
  readonly showStageHistory = input(true);
  readonly showActivity = input(true);
  readonly externalEditToken = input(0);
  readonly stageHistory = input<RdStageHistoryEntry[]>([]);
  readonly memberDisplayNames = computed(() => {
    const unique = new Set<string>();
    for (const item of this.memberProgressList()) {
      const name = item.memberName?.trim();
      if (name) {
        unique.add(name);
      }
    }
    return Array.from(unique);
  });
  readonly actionClick = output<'advance' | 'close' | 'reopen'>();
  readonly editRequest = output<void>();
  readonly basicSave = output<{ title: string; description: string | null }>();
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
  constructor() {
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

    effect(() => {
      const token = this.externalEditToken();
      if (token <= 0 || token === this.handledExternalEditToken) {
        return;
      }
      this.handledExternalEditToken = token;
      if (this.canEditBasic() && this.showSummary()) {
        this.startBasicEdit();
      }
    });
  }

  handleEditClick(): void {
    if (!this.canEditBasic()) {
      return;
    }
    if (this.showSummary()) {
      this.startBasicEdit();
      return;
    }
    this.editRequest.emit();
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
