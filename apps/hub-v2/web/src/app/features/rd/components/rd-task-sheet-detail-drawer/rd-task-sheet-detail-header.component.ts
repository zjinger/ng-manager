import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';

import {
  RD_TASK_SHEET_BUSINESS_TYPE_LABELS,
  RD_TASK_SHEET_STATUS_LABELS,
  RD_TASK_SHEET_URGENCY_LABELS,
  type RdTaskSheetBusinessType,
  type RdTaskSheetDetail,
  type RdTaskSheetStatus,
  type RdTaskSheetUrgency,
} from '../../models/rd-task-sheet.model';

type ConvertKind = 'rd' | 'issue';

@Component({
  selector: 'app-rd-task-sheet-detail-header',
  standalone: true,
  imports: [NzButtonModule, NzIconModule, NzTagModule],
  template: `
    @if (detail(); as current) {
      <section class="summary-card">
        <div class="summary-card__main">
          <div class="summary-card__tags">
            <nz-tag [nzColor]="statusColor(current.status)">{{ statusLabel(current.status) }}</nz-tag>
            <nz-tag>{{ businessTypeLabel(current.businessType) }}</nz-tag>
            <nz-tag [nzColor]="current.urgency === 'urgent' ? 'red' : 'default'">{{ urgencyLabel(current.urgency) }}</nz-tag>
          </div>
          <div class="summary-card__actions">
            <button nz-button [nzLoading]="exporting()" (click)="exportWord.emit(current)">
              <span nz-icon nzType="download"></span>
              导出 Word
            </button>
            @if (!current.convertedRdItemId) {
              <button nz-button (click)="convert.emit('rd')">转研发项</button>
            } @else {
              <nz-tag nzColor="blue">已转研发项</nz-tag>
            }
            @if (!current.convertedIssueId) {
              <button nz-button (click)="convert.emit('issue')">转测试单</button>
            } @else {
              <nz-tag nzColor="purple">已转测试单</nz-tag>
            }
            @if (current.status === 'draft') {
              <button nz-button (click)="edit.emit(current)">编辑</button>
              <button nz-button nzType="primary" [nzLoading]="busy()" (click)="issue.emit(current.id)">下发</button>
            }
            @if (current.status === 'issued') {
              <button nz-button nzType="primary" [nzLoading]="busy()" (click)="startProcessing.emit(current.id)">开始处理</button>
            }
            @if (current.status === 'issued' || current.status === 'processing') {
              <button nz-button (click)="reply.emit(current)">回复</button>
            }
            @if (current.status === 'replied') {
              <button nz-button nzDanger [nzLoading]="busy()" (click)="closeSheet.emit(current.id)">关闭</button>
            }
          </div>
        </div>
      </section>
    }
  `,
  styles: [
    `
      .summary-card {
        border: 1px solid var(--border-color);
        border-radius: 12px;
        background: var(--bg-container);
        box-shadow: 0 16px 36px rgba(15, 23, 42, 0.05);
      }
      .summary-card__main {
        display: grid;
        gap: 14px;
        padding: 16px;
      }
      .summary-card__tags,
      .summary-card__actions {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 10px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdTaskSheetDetailHeaderComponent {
  readonly detail = input<RdTaskSheetDetail | null>(null);
  readonly busy = input(false);
  readonly exporting = input(false);
  readonly exportWord = output<RdTaskSheetDetail>();
  readonly convert = output<ConvertKind>();
  readonly edit = output<RdTaskSheetDetail>();
  readonly issue = output<string>();
  readonly startProcessing = output<string>();
  readonly reply = output<RdTaskSheetDetail>();
  readonly closeSheet = output<string>();

  statusLabel(status: RdTaskSheetStatus): string {
    return RD_TASK_SHEET_STATUS_LABELS[status] ?? status;
  }

  urgencyLabel(urgency: RdTaskSheetUrgency): string {
    return RD_TASK_SHEET_URGENCY_LABELS[urgency] ?? urgency;
  }

  businessTypeLabel(type: RdTaskSheetBusinessType): string {
    return RD_TASK_SHEET_BUSINESS_TYPE_LABELS[type] ?? type;
  }

  statusColor(status: RdTaskSheetStatus): string {
    return {
      draft: 'default',
      issued: 'blue',
      processing: 'orange',
      replied: 'green',
      closed: 'default',
    }[status];
  }
}
