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
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { IssueEntity, IssueParticipantEntity } from '../models/issue.model';

@Component({
  selector: 'app-issue-create-branch-dialog',
  standalone: true,
  imports: [
    FormsModule,
    NzButtonModule,
    NzInputModule,
    NzSelectModule,
    NzModalModule,
    NzIconModule,
  ],
  template: `
    <nz-modal
      [nzVisible]="open()"
      [nzWidth]="680"
      [nzClosable]="true"
      [nzMaskClosable]="false"
      [nzOkLoading]="busy()"
      (nzOnCancel)="cancel.emit()"
      (nzOnOk)="confirmSubmit()"
      [nzOkDisabled]="disabledSubmit()"
    >
      <div *nzModalTitle>
        <div class="modal-title">
          <span class="modal-title__main">
            <nz-icon nzType="plus-circle" nzTheme="twotone" />
            创建协作分支
          </span>
          <div class="modal-subtitle">
            {{ issue() ? issue()!.title : '为协作人拆分处理分支。' }}
          </div>
        </div>
      </div>

      <ng-container *nzModalContent>
        <p class="label">协作人</p>
        <nz-select
          nzShowSearch
          nzPlaceHolder="选择要负责该分支的协作人"
          [ngModel]="selectedOwnerUserId()"
          (ngModelChange)="selectedOwnerUserId.set($event)"
          class="participant-selector"
        >
          @for (participant of participants(); track participant.id) {
            <nz-option [nzLabel]="participant.userName" [nzValue]="participant.userId"></nz-option>
          }
        </nz-select>

        <p class="label">分支标题</p>
        <input
          nz-input
          [ngModel]="title()"
          (ngModelChange)="title.set(($event ?? '').toString())"
          placeholder="例如：排查前端渲染"
        />
      </ng-container>
    </nz-modal>
  `,
  styles: [
    `
      .participant-selector {
        width: 100%;
      }
      .modal-title__main {
        font-weight: bold;
      }

      .modal-title {
        display: flex;
        flex-direction: column;
      }

      .modal-subtitle {
        margin-top: 10px;
        color: #999;
        font-size: 14px;
        line-height: 20px;
      }

      .label {
        font-weight: bold;
        font-size: 0.875rem;
        margin: 12px 0 4px;
      }

      .hint {
        font-size: small;
        color: gray;
        text-align: right;
        margin-top: 8px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssueCreateBranchDialogComponent {
  readonly open = input(false);
  readonly busy = input(false);
  readonly issue = input<IssueEntity | null>(null);
  readonly participants = input<IssueParticipantEntity[]>([]);
  readonly cancel = output<void>();
  readonly confirm = output<{ ownerUserId: string; title: string }>();

  readonly selectedOwnerUserId = signal<string | null>(null);
  readonly title = signal('');

  readonly disabledSubmit = computed(
    () => !this.selectedOwnerUserId()?.trim() || !this.title().trim(),
  );

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }
      this.selectedOwnerUserId.set(this.participants()[0]?.userId ?? null);
      this.title.set('');
    });
  }

  confirmSubmit(): void {
    const ownerUserId = this.selectedOwnerUserId()?.trim();
    const title = this.title().trim();

    if (!ownerUserId || !title) {
      return;
    }

    this.confirm.emit({ ownerUserId, title });
  }
}
