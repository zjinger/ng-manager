import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HasPermissionDirective } from '@app/core/auth/has-permission.directive';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';

@Component({
  selector: 'app-reimbursement-submit-action-card',
  standalone: true,
  imports: [CommonModule, FormsModule, HasPermissionDirective, NzButtonModule, NzIconModule, NzInputModule],
  template: `
    <div class="card query-card" *appHasPermission="'expense.submit'">
      <div class="query-card__label">提交操作</div>
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
  `,
  styles: [
    `
      .card {
        background: var(--bg-container);
        border: 1px solid var(--border-color);
        border-radius: 14px;
        padding: 16px;
        min-width: 0;
      }

      .query-card__label {
        margin-bottom: 10px;
        font-size: 15px;
        font-weight: 600;
        color: var(--text-heading);
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
