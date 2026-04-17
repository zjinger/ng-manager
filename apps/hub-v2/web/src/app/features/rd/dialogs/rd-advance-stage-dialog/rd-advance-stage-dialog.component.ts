import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';

import type { ProjectMemberEntity } from '../../../projects/models/project.model';
import type { RdItemEntity, RdStageEntity } from '../../models/rd.model';

@Component({
  selector: 'app-rd-advance-stage-dialog',
  standalone: true,
  imports: [FormsModule, NzModalModule, NzSelectModule, NzButtonModule],
  template: `
    <nz-modal
      [nzVisible]="open()"
      [nzTitle]="'进入下一阶段'"
      [nzOkText]="'确认推进'"
      [nzCancelText]="'取消'"
      [nzOkLoading]="busy()"
      [nzOkDisabled]="busy() || !selectedStageId() || selectedMemberIds().length === 0"
      (nzOnCancel)="cancel.emit()"
      (nzOnOk)="confirmSelection()"
    >
      <ng-container *nzModalContent>
        @if (item(); as current) {
          <p class="hint">
            当前研发项：<strong>{{ current.title }}</strong>
          </p>
          <nz-select
            nzShowSearch
            nzPlaceHolder="选择下一阶段"
            class="stage-select"
            [ngModel]="selectedStageId()"
            (ngModelChange)="selectedStageId.set($event || '')"
          >
            @for (stage of candidateStages(); track stage.id) {
              <nz-option [nzLabel]="stage.name" [nzValue]="stage.id"></nz-option>
            }
          </nz-select>
          <nz-select
            nzMode="multiple"
            nzShowSearch
            nzPlaceHolder="选择下一阶段成员（默认沿用当前成员）"
            class="member-select"
            [ngModel]="selectedMemberIds()"
            (ngModelChange)="selectedMemberIds.set(normalizeMemberIds($event))"
          >
            @for (member of members(); track member.userId) {
              <nz-option [nzLabel]="member.displayName" [nzValue]="member.userId"></nz-option>
            }
          </nz-select>
          @if (selectedMemberIds().length === 0) {
            <p class="empty">请至少选择 1 名执行人。</p>
          }
          @if (candidateStages().length === 0) {
            <p class="empty">当前项目没有可推进的后续阶段。</p>
          }
        }
      </ng-container>
    </nz-modal>
  `,
  styles: [
    `
      .hint {
        margin: 0 0 12px;
        color: var(--text-secondary);
      }
      .stage-select {
        width: 100%;
      }
      .member-select {
        width: 100%;
        margin-top: 10px;
      }
      .empty {
        margin: 12px 0 0;
        color: var(--text-muted);
        font-size: 12px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdAdvanceStageDialogComponent {
  readonly open = input(false);
  readonly busy = input(false);
  readonly item = input<RdItemEntity | null>(null);
  readonly stages = input<RdStageEntity[]>([]);
  readonly members = input<ProjectMemberEntity[]>([]);
  readonly currentMemberIds = input<string[]>([]);
  readonly confirm = output<{ stageId: string; memberIds: string[] }>();
  readonly cancel = output<void>();

  readonly selectedStageId = signal('');
  readonly selectedMemberIds = signal<string[]>([]);
  readonly candidateStages = computed(() => {
    const current = this.item();
    const all = [...this.stages()].sort((a, b) => a.sort - b.sort);
    if (!current) {
      return [];
    }
    if (!current.stageId) {
      return all;
    }
    const currentStage = all.find((stage) => stage.id === current.stageId);
    if (!currentStage) {
      return all;
    }
    return all.filter((stage) => stage.sort > currentStage.sort);
  });

  constructor() {
    effect(() => {
      if (!this.open()) {
        this.selectedStageId.set('');
        this.selectedMemberIds.set([]);
        return;
      }
      const first = this.candidateStages()[0];
      this.selectedStageId.set(first?.id ?? '');
      this.selectedMemberIds.set(this.normalizeMemberIds(this.currentMemberIds()));
    });
  }

  confirmSelection(): void {
    const stageId = this.selectedStageId().trim();
    if (!stageId) {
      return;
    }
    this.confirm.emit({ stageId, memberIds: this.selectedMemberIds() });
  }

  normalizeMemberIds(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return Array.from(new Set(value.map((item) => String(item || '').trim()).filter(Boolean)));
  }
}
