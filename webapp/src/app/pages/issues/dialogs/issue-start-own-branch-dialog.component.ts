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

import type { IssueEntity } from '../models/issue.model';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzIconModule } from 'ng-zorro-antd/icon';

@Component({
  selector: 'app-issue-start-own-branch-dialog',
  standalone: true,
  imports: [FormsModule, NzButtonModule, NzInputModule, NzModalModule, NzIconModule],
  template: `
    <nz-modal
      [nzVisible]="open()"
      [nzWidth]="640"
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
            <nz-icon nzType="play-circle" nzTheme="twotone" />
            开始协作
          </span>
          <div class="modal-subtitle">
            {{ issue() ? issue()!.title : '填写本次协作内容。' }}
          </div>
        </div>
      </div>
      <ng-container *nzModalContent>
        <p class="label">协作内容</p>
        <input
          nz-input
          maxlength="80"
          [ngModel]="title()"
          (ngModelChange)="title.set(($event ?? '').toString())"
          placeholder="例如：补抓包定位登录异常"
        />
        <div class="hint">提交后会自动创建并开始你的协作分支。</div>
      </ng-container>
    </nz-modal>
  `,
  styles: [
    `
    .modal-title__main{
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
        margin-bottom: 4px;
      }
      .hint {
        font-size: small;
        color: gray;
        text-align: right;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssueStartOwnBranchDialogComponent {
  readonly open = input(false);
  readonly busy = input(false);
  readonly issue = input<IssueEntity | null>(null);
  readonly cancel = output<void>();
  readonly confirm = output<{ title: string }>();

  readonly title = signal('');
  readonly disabledSubmit = computed(() => !this.title().trim());

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }
      this.title.set('');
    });
  }

  confirmSubmit(): void {
    const title = this.title().trim();
    if (!title) {
      return;
    }
    this.confirm.emit({ title });
  }
}
