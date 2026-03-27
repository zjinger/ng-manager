import { Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RdItemEntity } from '@pages/rd/models/rd.model';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';

@Component({
  selector: 'app-rd-block-dialog',
  imports: [NzModalModule, FormsModule, NzButtonModule, NzInputModule],
  template: `
    <nz-modal
      [nzVisible]="open()"
      nzTitle="标记为阻塞"
      [nzWidth]="640"
      [nzClosable]="true"
      [nzMaskClosable]="false"
      [nzOkLoading]="busy()"
      (nzOnCancel)="cancel.emit()"
      (nzOnOk)="submitForm()"
    >
      <!-- subtitle（原来的 subtitle 需要手动补） -->
      <div *nzModalTitle>
        <div class="modal-title">
          <span>标记为阻塞</span>
          <div class="modal-subtitle">
            {{ item() ? item()!.title : '记录当前研发项的阻塞原因。' }}
          </div>
        </div>
      </div>

      <!-- body -->
      <ng-container *nzModalContent>
        <form class="block-form" (ngSubmit)="submitForm()">
          <!-- <label class="block-field dialog-field"> -->
            <!-- <span class="label">阻塞原因:</span> -->
            <textarea
              nz-input
              rows="6"
              placeholder="请输入阻塞原因。例如：依赖的接口定义尚未冻结，无法继续联调。"
              [ngModel]="reason()"
              name="reason"
              (ngModelChange)="reason.set($event)"
              class="block-input"
            ></textarea>
          <!-- </label> -->
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
          确认阻塞
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
export class RdBlockDialogComponent {
  readonly open = input(true);
  readonly busy = input(false);
  readonly item = input<RdItemEntity | null>(null);
  readonly confirm = output<{ blockerReason: string }>();
  readonly cancel = output<void>();

  readonly reason = signal('');

  constructor() {
    effect(() => {
      if (this.open()) {
        this.reason.set(this.item()?.blockerReason ?? '');
      }
    });
  }

  submitForm(): void {
    const blockerReason = this.reason().trim();
    if (!blockerReason) {
      return;
    }
    this.confirm.emit({ blockerReason });
  }
}
