import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { ReimbursementLogEntity } from '@app/features/reimbursement/models/reimbursement.model';
import { PanelCardComponent } from '@app/shared/ui';
import { RecordListComponent } from '../record-list/record-list.component';

@Component({
  selector: 'app-reimbursement-logs-card',
  standalone: true,
  imports: [CommonModule, PanelCardComponent, RecordListComponent],
  template: `
    <app-panel-card [title]="title()" [empty]="records().length === 0" emptyText="暂无操作记录">
      <div class="logs-body" [attr.data-variant]="variant()">
        <app-record-list [records]="records()" />
      </div>
    </app-panel-card>
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }

      :host {
        height: 100%;
      }

      .logs-body {
        padding: 0 20px 2px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReimbursementLogsCardComponent {
  readonly records = input<ReimbursementLogEntity[]>([]);
  readonly title = input('操作记录');
  readonly variant = input<'query' | 'detail'>('query');
}
