import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';

import type { ProjectMemberEntity } from '@models/project.model';
import { IssueParticipantEntity, type IssueEntity } from '../models/issue.model';
import { NzModalModule } from 'ng-zorro-antd/modal';

@Component({
  selector: 'app-issue-add-participants-dialog',
  standalone: true,
  imports: [FormsModule, NzButtonModule, NzSelectModule, NzModalModule],
  template: `
    <nz-modal
      [nzVisible]="open()"
      [nzClosable]="true"
      [nzMaskClosable]="false"
      [nzOkLoading]="busy()"
      [nzOkDisabled]="disabledSubmit()"
      nzOkText="添加协作人"
      (nzOnCancel)="cancel.emit()"
      (nzOnOk)="confirmSubmit()"
    >
      <!-- subtitle -->
      <div *nzModalTitle>
        <div class="modal-title">
          <span>协作人（可多选）</span>
          <div class="modal-subtitle">
            {{ issue() ? issue()!.title : '选择协作人' }}
          </div>
        </div>
      </div>

      <!-- body -->
      <ng-container *nzModalContent>
        <p class="label">协作人:</p>
        <nz-select
          nzShowSearch
          nzPlaceHolder="选择项目成员（负责人不可选）"
          nzMode="multiple"
          class="select"
          [ngModel]="selectedUserIds()"
          (ngModelChange)="onSelectedChange($event)"
        >
          @for (member of memberOptions(); track member.id) {
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
    .select {
      width: 100%;
    }
    .label {
      font-size: 0.8rem;
      color: gray;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssueAddParticipantsDialogComponent {
  readonly open = input(false);
  readonly busy = input(false);
  readonly issue = input<IssueEntity | null>(null);
  readonly members = input<ProjectMemberEntity[]>([]);
  readonly participants = input<IssueParticipantEntity[]>([]);
  readonly cancel = output<void>();
  readonly confirm = output<{ userIds: string[] }>();

  readonly selectedUserIds = signal<string[]>([]);
  readonly disabledSubmit = computed(() => this.selectedUserIds().length === 0);

  readonly memberOptions = computed(() => {
    return this.members().filter((member) => {
      const participants = this.participants();
      const same = participants.find((par) => {
        return par.userId === member.userId;
      });
      return member.userId !== this.issue()?.assigneeId && !same;
    });
  });

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }
      this.selectedUserIds.set([]);
    });
  }

  confirmSubmit(): void {
    const userIds = [
      ...new Set(
        this.selectedUserIds()
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    ];
    if (userIds.length === 0) {
      return;
    }
    this.confirm.emit({ userIds });
  }

  onSelectedChange(value: unknown): void {
    this.selectedUserIds.set(Array.isArray(value) ? (value as string[]) : []);
  }
}
