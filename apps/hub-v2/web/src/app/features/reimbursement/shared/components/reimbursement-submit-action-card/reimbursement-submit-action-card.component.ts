import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HasPermissionDirective } from '@app/core/auth/has-permission.directive';
import { PanelCardComponent } from '@app/shared/ui';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';

@Component({
  selector: 'app-reimbursement-submit-action-card',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HasPermissionDirective,
    PanelCardComponent,
    NzButtonModule,
    NzIconModule,
    NzInputModule,
  ],
  template: `
    <ng-container *appHasPermission="'expense.submit'">
      <app-panel-card title="提交操作">
        <div class="submit-action-body">
          <textarea
            nz-input
            class="submit-comment"
            [ngModel]="comment()"
            (ngModelChange)="comment.set($event)"
            placeholder="请输入提交备注，例如：票据已上传，请审批"
          ></textarea>
          <div class="submit-actions">
            <button
              nz-button
              nzType="primary"
              [nzLoading]="submitting()"
              [disabled]="disabled()"
              (click)="submit.emit()"
            >
              <i nz-icon nzType="save"></i> {{ buttonText() }}
            </button>
          </div>
        </div>
      </app-panel-card>
    </ng-container>
  `,
  styles: [
    `
      .submit-action-body {
        padding: 16px 20px 20px;
      }

      .submit-comment {
        min-height: 92px;
        resize: vertical;
      }

      .submit-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 14px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReimbursementSubmitActionCardComponent {
  readonly comment = model('');
  readonly submitting = input(false);
  readonly disabled = input(false);
  readonly buttonText = input('保存');
  readonly submit = output<void>();
}
