import { Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { IssueEntity } from '../models/issue.model';

@Component({
  selector: 'app-issue-resolve-dialog',
  imports: [NzModalModule, FormsModule, NzButtonModule, NzInputModule],
  template: `
    <nz-modal
      [nzVisible]="open()"
      [nzWidth]="640"
      [nzClosable]="true"
      [nzMaskClosable]="false"
      [nzOkLoading]="busy()"
      (nzOnCancel)="cancel.emit()"
      (nzOnOk)="submitForm()"
    >
      <!-- subtitle -->
      <div *nzModalTitle>
        <div class="modal-title">
          <span>标记解决</span>
          <div class="modal-subtitle">
            {{ item() ? item()!.title : '记录当前测试问题的解决说明。' }}
          </div>
        </div>
      </div>

      <!-- body -->
      <ng-container *nzModalContent>
        <form class="block-form" (ngSubmit)="submitForm()">
          <textarea
            nz-input
            rows="6"
            placeholder="请输入解决说明。"
            [ngModel]="reason()"
            name="reason"
            (ngModelChange)="reason.set($event)"
            class="block-input"
          ></textarea>
        </form>
      </ng-container>

      <!-- footer（自定义按钮） -->
      <ng-container *nzModalFooter>
        <button nz-button type="button" (click)="cancel.emit()">取消</button>
        <button
          nz-button
          nzType="primary"
          [disabled]="!reason().trim()"
          [nzLoading]="busy()"
          (click)="submitForm()"
        >
          确认解决
        </button>
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
    .block-input {
      border-radius: 8px;
    }
  `,
})
export class IssueResolveDialogComponent {
  readonly open = input(true);
  readonly busy = input(false);
  readonly item = input<IssueEntity | null>(null);

  readonly confirm = output<string>();
  readonly cancel = output<void>();

  readonly reason = signal('已解决');

  constructor() {
    effect(() => {
      if (this.open()) {
        this.reason.set(this.item()?.closeReason ?? '已解决');
      }
    });
  }

  submitForm(): void {
    const resolveReason = this.reason().trim();
    if (!resolveReason) {
      return;
    }
    this.confirm.emit(resolveReason);
  }
}
