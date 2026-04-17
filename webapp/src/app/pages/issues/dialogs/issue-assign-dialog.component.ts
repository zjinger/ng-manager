import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';

import type { ProjectMemberEntity } from '@models/project.model';
import type { AssignIssueInput, IssueEntity } from '../models/issue.model';
import { NzModalModule } from 'ng-zorro-antd/modal';

@Component({
  selector: 'app-issue-assign-dialog',
  standalone: true,
  imports: [FormsModule, NzButtonModule, NzSelectModule, NzModalModule],
  template: `
    <nz-modal
      [nzVisible]="open()"
      [nzClosable]="true"
      [nzMaskClosable]="false"
      [nzOkLoading]="busy()"
      [nzOkDisabled]="!assigneeId()"
      [nzOkText]="confirmText()"
      [nzOkDisabled]="!assigneeId()"
      (nzOnCancel)="cancel.emit()"
      (nzOnOk)="confirmAssign()"
    >
      <!-- subtitle -->
      <div *nzModalTitle>
        <div class="modal-title">
          <span>{{ dialogTitle() }}</span>
          <div class="modal-subtitle">
            {{ issue() ? issue()!.title : '选择新的负责人。' }}
          </div>
        </div>
      </div>

      <!-- body -->
      <ng-container *nzModalContent>
        <p class="assignee">负责人:</p>
        <nz-select
          nzShowSearch
          nzPlaceHolder="选择项目成员"
          class="assignee-select"
          [ngModel]="assigneeId()"
          (ngModelChange)="assigneeId.set($event || '')"
        >
          @for (member of filterMembers(); track member.id) {
            <nz-option [nzLabel]="member.displayName" [nzValue]="member.userId"></nz-option>
          }
        </nz-select>
      </ng-container>
    </nz-modal>
  `,
  styles: `
    .modal-title {
      display: flex;
      flex-direction: column;
    }
    .modal-subtitle {
      color: #999;
      font-size: 14px;
      line-height: 20px;
    }
    .assignee-select {
      width: 100%;
    }
    .assignee{
      font-size: .8rem;
      color:gray;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssueAssignDialogComponent {
  readonly open = input(false);
  readonly busy = input(false);
  readonly issue = input<IssueEntity | null>(null);
  readonly actionLabel = input('重新指派');
  readonly members = input<ProjectMemberEntity[]>([]);
  readonly confirm = output<AssignIssueInput>();
  readonly cancel = output<void>();

  readonly assigneeId = signal('');

  readonly filterMembers = computed(() => {
    const currentAssigneeId = this.issue()?.assigneeId?.trim() || '';
    return this.members().filter((member) => member.userId !== currentAssigneeId);
  });

  constructor() {
    effect(() => {
      if (this.open()) {
        this.assigneeId.set('');
      }
    });
  }

  dialogTitle(): string {
    const label = this.actionLabel();
    if (label === '指派') {
      return '指派负责人';
    }
    if (label === '转派') {
      return '转派负责人';
    }
    return '重新指派负责人';
  }

  confirmText(): string {
    const label = this.actionLabel();
    if (label === '指派') {
      return '确认指派';
    }
    if (label === '转派') {
      return '确认转派';
    }
    return '确认重新指派';
  }

  confirmAssign(): void {
    if (!this.assigneeId()) {
      return;
    }
    this.confirm.emit({ assigneeId: this.assigneeId() });
  }
}
