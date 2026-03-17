import {
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalRef, NzModalService } from 'ng-zorro-antd/modal';

@Component({
  selector: 'app-issue-close-modal',
  imports: [
    ReactiveFormsModule,
    NzButtonModule,
    NzFormModule,
    NzInputModule,
    FormsModule,
    NzModalModule,
  ],
  template: `
    <nz-modal
      [nzVisible]="closeVisible"
      [nzTitle]="titleTpl"
      nzOkText="确认关闭该issue"
      [nzOkDanger]="true"
      nzCancelText="取消"
      [nzOkDisabled]="!closeReason.trim()"
      (nzOnCancel)="handleCloseCancel()"
      (nzOnOk)="handleCloseOk()"
    >
      <ng-template #titleTpl>
        <span style="font-size: 1.2rem; font-weight: bold;">关闭确认</span>
      </ng-template>
      <ng-container *nzModalContent>
        <p class="mb-3">请填写关闭原因后再确认。</p>

        <textarea
          nz-input
          [(ngModel)]="closeReason"
          rows="4"
          maxlength="200"
          placeholder="请输入关闭原因"
        >
        </textarea>

        <div class="mt-2 text-muted">{{ closeReason.length }}/200</div>
      </ng-container>
    </nz-modal>
  `,
  styleUrl: './issue-close-modal.component.less',
})
export class IssueCloseModalComponent {
  private msg = inject(NzMessageService);
  @Input() closeVisible = false;
  @Output() readonly closeVisibleChange = new EventEmitter<boolean>();
  @Output() readonly closeOk = new EventEmitter<string>();
  closeReason = '';

  handleCloseCancel(): void {
    this.closeVisibleChange.emit(false)
    this.closeReason = '';
  }

  handleCloseOk(): void {
    const reason = this.closeReason.trim();
    if (!reason) {
      this.msg.error('请输入关闭原因');
      return;
    }
    this.closeOk.emit(this.closeReason);
    this.closeVisibleChange.emit(false);
    this.closeVisible = false;
    this.closeReason = '';
  }
}
