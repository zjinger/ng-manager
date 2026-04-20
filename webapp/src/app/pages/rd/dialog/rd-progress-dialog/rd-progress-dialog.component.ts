import { Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RdItemEntity, RdItemProgress } from '@pages/rd/models/rd.model';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSliderModule } from 'ng-zorro-antd/slider';
import { NzTabLinkTemplateDirective } from 'ng-zorro-antd/tabs';

@Component({
  selector: 'app-rd-progress-dialog',
  imports: [
    NzModalModule,
    FormsModule,
    NzButtonModule,
    NzInputModule,
    NzSliderModule,
    NzAlertModule,
    NzIconModule,
  ],
  template: `
    <nz-modal
      [nzVisible]="open()"
      [nzWidth]="600"
      [nzClosable]="true"
      [nzMaskClosable]="false"
      (nzOnCancel)="cancel.emit()"
    >
      <!-- title -->
      <div *nzModalTitle>
        <div class="modal-title">
          <span>更新我的进度</span>
          <div class="modal-subtitle">
            {{ rdItem() ? rdItem()!.title : '' }}
          </div>
        </div>
      </div>

      <!-- content -->
      <ng-container *nzModalContent>
        <div class="progress-form">
          <!-- 成员 -->
          <div class="field">
            <div class="label">成员</div>
            <div class="value">{{ progress()?.userName ?? '_ _' }}</div>
          </div>

          <!-- 进度 -->
          <div class="field">
            <div class="label">进度值</div>

            <nz-slider
              [ngModel]="progressDraft()"
              (ngModelChange)="progressDraft.set($event)"
              [nzMin]="0"
              [nzMax]="100"
            ></nz-slider>

            <div class="progress-value">{{ progressDraft() }}%</div>
          </div>

          <!-- 说明 -->
          <div class="field">
            <div class="label">进度说明（可选）</div>
            <textarea
              nz-input
              rows="4"
              placeholder="例如：完成了核心模块开发，待联调测试..."
              [ngModel]="note()"
              (ngModelChange)="note.set($event)"
            ></textarea>
          </div>

          <!-- 提示 -->
          <nz-alert nzType="info" [nzMessage]="alertInfoTemplate" />
          <ng-template #alertInfoTemplate>
            <div class="hint"><nz-icon nzType="bulb" nzTheme="fill" /> 仅允许更新自己的进度</div>
          </ng-template>
        </div>
      </ng-container>

      <!-- footer -->
      <ng-container *nzModalFooter>
        <button nz-button (click)="cancel.emit()">取消</button>
        <button nz-button nzType="primary" [nzLoading]="busy()" (click)="submitForm()">
          保存进度
        </button>
      </ng-container>
    </nz-modal>
  `,
  styles: `
    .modal-title {
      font-size: 16px;
      font-weight: 600;
    }
    .modal-subtitle {
      color: #999;
      font-size: 14px;
      line-height: 20px;
    }
    .progress-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .label {
      font-size: 0.875rem;
      color: #8c8c8c;
    }

    .value {
      font-size: 1rem;
      font-weight: 500;
      color: #262626;
    }

    .progress-value {
      text-align: center;
      font-size: 28px;
      font-weight: 600;
      color: #262626;
      margin-top: 8px;
    }

    textarea {
      border-radius: 8px;
    }

    .hint {
      font-size: 12px;
      color: #8c8c8c;
    }

    ::ng-deep .ant-alert-info {
      border-radius: 8px;
    }
  `,
})
export class RdProgressDialogComponent {
  readonly open = input(false);
  readonly busy = input(false);

  readonly progress = input<RdItemProgress | null>(null);
  readonly rdItem = input<RdItemEntity | null>(null);

  readonly confirm = output<{
    progress: number;
    note: string;
  }>();

  readonly cancel = output<void>();

  readonly progressDraft = signal(0);
  readonly note = signal('');

  constructor() {
    effect(() => {
      if (this.open()) {
        this.progressDraft.set(this.progress()?.progress || 0);
        this.note.set('');
      }
    });
  }

  submitForm(): void {
    this.confirm.emit({
      progress: this.progressDraft(),
      note: this.note().trim(),
    });
  }
}
