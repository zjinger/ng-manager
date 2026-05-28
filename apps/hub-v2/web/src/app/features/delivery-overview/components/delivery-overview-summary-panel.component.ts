import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';

import { PanelCardComponent } from '@shared/ui';
import type { SummaryBlock } from '../models/delivery-overview.model';
import { DeliveryOverviewSummaryEditDialogComponent } from './delivery-overview-summary-edit-dialog.component';

@Component({
  selector: 'app-delivery-overview-summary-panel',
  standalone: true,
  imports: [DeliveryOverviewSummaryEditDialogComponent, NzIconModule, PanelCardComponent],
  template: `
    <app-panel-card title="周报摘要">
      @if (canEdit()) {
        <button panel-actions type="button" class="action-btn" title="编辑周报摘要" data-export-hidden (click)="dialogOpen.set(true)">
          编辑摘要
        </button>
      }
      <div class="summary-grid">
        @for (summary of summaries(); track summary.title) {
          <div class="summary-card" [attr.data-tone]="summary.tone">
            <h3><span nz-icon [nzType]="summary.icon"></span> {{ summary.title }}</h3>
            <p>{{ summary.content }}</p>
            <div>{{ summary.meta }}</div>
          </div>
        }
      </div>
    </app-panel-card>

    <app-delivery-overview-summary-edit-dialog
      [open]="dialogOpen()"
      [summaries]="summaries()"
      (cancel)="dialogOpen.set(false)"
      (confirm)="applySummaries($event)"
      (restore)="restoreSummaries()"
    />
  `,
  styles: [
    `
      .action-btn {
        height: 36px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius-sm);
        background: var(--bg-container);
        color: var(--text-secondary);
        padding: 0 12px;
        font-weight: 600;
        cursor: pointer;
      }
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
        padding: 18px;
      }
      .summary-card {
        padding: 16px;
        border: 1px solid var(--border-color-soft);
        border-radius: var(--border-radius-sm);
        background: var(--bg-subtle);
      }
      .summary-card h3 {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0;
        color: var(--text-heading);
        font-size: 14px;
        letter-spacing: 0;
      }
      .summary-card h3 [nz-icon] {
        color: var(--primary-600);
      }
      .summary-card[data-tone='green'] h3 [nz-icon] {
        color: var(--color-success);
      }
      .summary-card[data-tone='orange'] h3 [nz-icon],
      .summary-card[data-tone='red'] h3 [nz-icon] {
        color: var(--color-warning);
      }
      .summary-card p {
        margin: 10px 0 0;
        color: var(--text-secondary);
        line-height: 1.7;
        min-height: 72px;
      }
      .summary-card div {
        margin-top: 12px;
        padding-top: 10px;
        border-top: 1px dashed var(--border-color);
        color: var(--text-disabled);
        font-size: 12px;
      }
      @media (max-width: 900px) {
        .summary-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeliveryOverviewSummaryPanelComponent {
  readonly summaries = input.required<SummaryBlock[]>();
  readonly canEdit = input(false);
  readonly summariesChange = output<SummaryBlock[]>();
  readonly restoreDefault = output<void>();

  readonly dialogOpen = signal(false);

  applySummaries(summaries: SummaryBlock[]): void {
    this.summariesChange.emit(summaries);
    this.dialogOpen.set(false);
  }

  restoreSummaries(): void {
    this.restoreDefault.emit();
    this.dialogOpen.set(false);
  }
}
