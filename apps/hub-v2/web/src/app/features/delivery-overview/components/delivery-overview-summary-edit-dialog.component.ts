import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';

import { DialogShellComponent } from '@shared/ui';
import type { SummaryBlock } from '../models/delivery-overview.model';

@Component({
  selector: 'app-delivery-overview-summary-edit-dialog',
  standalone: true,
  imports: [DialogShellComponent, FormsModule, NzButtonModule, NzIconModule, NzInputModule],
  template: `
    <app-dialog-shell
      [open]="open()"
      [center]="true"
      [width]="860"
      [title]="'编辑周报摘要'"
      [subtitle]="'调整本次周报汇报展示内容。'"
      [icon]="'edit'"
      [modalClass]="'delivery-summary-edit-modal'"
      (cancel)="cancel.emit()"
    >
      <div dialog-body>
        <form id="delivery-summary-edit-form" class="summary-edit-form" (ngSubmit)="submit()">
          @for (item of draft(); track item.title; let index = $index) {
            <section class="summary-edit-item">
              <div class="summary-edit-item__header">
                <span class="summary-edit-item__icon" nz-icon [nzType]="item.icon"></span>
                <div>
                  <strong>{{ item.title }}</strong>
                  <small>{{ item.meta }}</small>
                </div>
              </div>
              <textarea
                nz-input
                rows="4"
                maxlength="500"
                [name]="'summary-' + index"
                [ngModel]="item.content"
                (ngModelChange)="updateContent(index, $event)"
                [placeholder]="item.title + '内容'"
              ></textarea>
            </section>
          }

          <p class="summary-edit-tip">当前仅应用到本页展示，刷新页面后会恢复默认摘要。</p>
        </form>
      </div>

      <ng-container dialog-footer>
        <div class="summary-edit-footer">
          <button nz-button type="button" (click)="restore.emit()">恢复默认摘要</button>
          <span class="summary-edit-footer__spacer"></span>
          <button nz-button type="button" (click)="cancel.emit()">取消</button>
          <button nz-button nzType="primary" type="submit" form="delivery-summary-edit-form" [disabled]="!canSubmit()">
            <nz-icon nzType="check" class="icon-left"></nz-icon>
            应用修改
          </button>
        </div>
      </ng-container>
    </app-dialog-shell>
  `,
  styles: [
    `
      .summary-edit-form {
        display: grid;
        gap: 14px;
      }
      .summary-edit-item {
        display: grid;
        gap: 10px;
        padding: 14px;
        border: 1px solid var(--border-color-soft);
        border-radius: var(--border-radius-sm);
        background: var(--bg-subtle);
      }
      .summary-edit-item__header {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .summary-edit-item__icon {
        color: var(--primary-600);
        font-size: 16px;
      }
      .summary-edit-item__header div {
        display: grid;
        gap: 2px;
        min-width: 0;
      }
      .summary-edit-item__header strong {
        color: var(--text-heading);
        font-size: 14px;
      }
      .summary-edit-item__header small {
        color: var(--text-muted);
        line-height: 1.4;
      }
      textarea.ant-input {
        border-radius: 12px;
        padding: 10px 12px;
        resize: vertical;
        line-height: 1.7;
      }
      .summary-edit-tip {
        margin: 2px 0 0;
        color: var(--text-muted);
        font-size: 12px;
      }
      .summary-edit-footer {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
      }
      .summary-edit-footer__spacer {
        flex: 1;
      }
      @media (max-width: 640px) {
        .summary-edit-footer {
          align-items: stretch;
          flex-direction: column;
        }
        .summary-edit-footer__spacer {
          display: none;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeliveryOverviewSummaryEditDialogComponent {
  readonly open = input(false);
  readonly summaries = input.required<SummaryBlock[]>();
  readonly cancel = output<void>();
  readonly confirm = output<SummaryBlock[]>();
  readonly restore = output<void>();

  readonly draft = signal<SummaryBlock[]>([]);
  readonly canSubmit = computed(() => this.draft().every((item) => item.content.trim().length > 0));

  constructor() {
    effect(() => {
      if (this.open()) {
        this.draft.set(this.cloneSummaries(this.summaries()));
      }
    });
  }

  updateContent(index: number, content: string): void {
    this.draft.update((items) =>
      items.map((item, itemIndex) => (itemIndex === index ? { ...item, content } : item)),
    );
  }

  submit(): void {
    if (!this.canSubmit()) {
      return;
    }
    this.confirm.emit(
      this.draft().map((item) => ({
        ...item,
        content: item.content.trim(),
      })),
    );
  }

  private cloneSummaries(items: SummaryBlock[]): SummaryBlock[] {
    return items.map((item) => ({ ...item }));
  }
}
