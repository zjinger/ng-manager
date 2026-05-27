import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';

import { DialogShellComponent } from '@shared/ui';
import type { MemberProgressItem } from '../../components/rd-progress-panel/rd-progress-panel.component';
import type { RdItemEntity } from '../../models/rd.model';

@Component({
  selector: 'app-rd-complete-dialog',
  standalone: true,
  imports: [FormsModule, NzButtonModule, NzInputModule, DialogShellComponent],
  template: `
    <app-dialog-shell
      [open]="open()"
      [width]="680"
      [title]="'标记完成'"
      [subtitle]="item()?.title || '确认研发项已完成。'"
      [icon]="'check-circle'"
      (cancel)="cancel.emit()"
    >
      <div dialog-body>
        @if (reasonRequired()) {
          <div class="complete-alert">
            <strong>{{ incompleteMembers().length }} 名执行人进度未到 100%</strong>
            <span>{{ incompleteMemberNames() }}。请补充完成判定依据，作为后续验收记录或说明。</span>
          </div>
        }
        <form id="rd-complete-form" class="complete-form" (ngSubmit)="submitForm()">
          <label class="complete-field dialog-field">
            <span class="complete-field__label dialog-field__label">
              完成说明
              @if (reasonRequired()) {
                <span class="complete-field__required">必填</span>
              } @else {
                <span class="complete-field__optional">可选</span>
              }
            </span>
            <textarea
              nz-input
              rows="6"
              [placeholder]="reasonRequired() ? '例如：剩余工作已由验证人确认不影响交付，后续事项另行跟进。' : '可补充本次完成确认说明。'"
              [ngModel]="reason()"
              name="reason"
              (ngModelChange)="reason.set($event)"
            ></textarea>
          </label>
        </form>
      </div>

      <ng-container dialog-footer>
        <button nz-button type="button" (click)="cancel.emit()">取消</button>
        <button nz-button nzType="primary" [disabled]="!canSubmit()" [nzLoading]="busy()" type="submit" form="rd-complete-form">
          确认完成
        </button>
      </ng-container>
    </app-dialog-shell>
  `,
  styles: [
    `
      .complete-alert {
        border: 1px solid rgba(245, 158, 11, 0.32);
        background: rgba(245, 158, 11, 0.08);
        color: rgb(180, 83, 9);
        border-radius: 8px;
        padding: 10px 12px;
        display: flex;
        flex-direction: column;
        gap: 2px;
        font-size: 12px;
        margin-bottom: 16px;
      }
      .complete-alert strong {
        font-size: 13px;
      }
      .complete-form {
        display: grid;
      }
      .complete-field__label {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .complete-field__required,
      .complete-field__optional {
        font-size: 11px;
        font-weight: 600;
      }
      .complete-field__required {
        color: var(--danger, #dc2626);
      }
      .complete-field__optional {
        color: var(--text-muted);
      }
      textarea {
        resize: vertical;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdCompleteDialogComponent {
  readonly open = input(false);
  readonly busy = input(false);
  readonly item = input<RdItemEntity | null>(null);
  readonly memberProgressList = input<MemberProgressItem[]>([]);
  readonly confirm = output<{ reason: string }>();
  readonly cancel = output<void>();

  readonly reason = signal('');
  readonly incompleteMembers = computed(() =>
    this.memberProgressList().filter((member) => member.isActiveMember && Number(member.progress) < 100)
  );
  readonly reasonRequired = computed(() => this.incompleteMembers().length > 0);
  readonly incompleteMemberNames = computed(() =>
    this.incompleteMembers()
      .map((member) => `${member.memberName} ${member.progress}%`)
      .slice(0, 4)
      .join('、')
  );

  constructor() {
    effect(() => {
      if (this.open()) {
        this.reason.set('');
      }
    });
  }

  canSubmit(): boolean {
    if (this.busy()) {
      return false;
    }
    return !this.reasonRequired() || !!this.reason().trim();
  }

  submitForm(): void {
    if (!this.canSubmit()) {
      return;
    }
    this.confirm.emit({ reason: this.reason().trim() });
  }
}
