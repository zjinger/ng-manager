import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';

import type { ReimbursementClaimDetail } from '@app/features/reimbursement/models/reimbursement.model';
import { PanelCardComponent } from '@app/shared/ui';
import { reimbursementHalfLabel, reimbursementStatusLabel } from '../../utils/reimbursement-detail-display.util';

@Component({
  selector: 'app-reimbursement-basic-info-panel',
  standalone: true,
  imports: [NzButtonModule, NzIconModule, PanelCardComponent],
  template: `
    <app-panel-card title="基础信息">
      <div panel-actions class="panel-actions">
        @if (canEdit()) {
          <button nz-button nzSize="small" nzType="primary" (click)="edit.emit()">
            <span nz-icon nzType="edit"></span>
            编辑
          </button>
        }
        <button nz-button nzSize="small" (click)="preview.emit()">
          <span nz-icon nzType="fullscreen"></span>
          单据预览
        </button>
        <button nz-button nzSize="small" [nzLoading]="exporting()" (click)="exportWord.emit()">
          <span nz-icon nzType="download"></span>
          导出
        </button>
      </div>

      <dl class="info-grid">
        <div>
          <dt>单据编号</dt>
          <dd class="mono">{{ detail().claimNo }}</dd>
        </div>
        <div>
          <dt>单据状态</dt>
          <dd>{{ statusLabel(detail().status) }}</dd>
        </div>
        <div>
          <dt>申请人</dt>
          <dd>{{ detail().applicantName }}</dd>
        </div>
        <div>
          <dt>职务</dt>
          <dd>{{ detail().applicantTitleName || '--' }}</dd>
        </div>
        <div>
          <dt>报销部门</dt>
          <dd>{{ detail().departmentName }}</dd>
        </div>
        <div>
          <dt>填报日期</dt>
          <dd>{{ detail().fillDate }}</dd>
        </div>
        <div class="info-grid__full">
          <dt>{{ detail().claimType === 'general' ? '备注' : '报销事由' }}</dt>
          <dd>{{ detail().reason || '--' }}</dd>
        </div>
        @if (detail().claimType === 'travel') {
          <div>
            <dt>出差开始</dt>
            <dd>{{ detail().travelStartDate || '--' }} {{ halfLabel(detail().travelStartHalf) }}</dd>
          </div>
          <div>
            <dt>出差结束</dt>
            <dd>{{ detail().travelEndDate || '--' }} {{ halfLabel(detail().travelEndHalf) }}</dd>
          </div>
          <div>
            <dt>出差天数</dt>
            <dd>{{ detail().travelDays ?? '--' }}</dd>
          </div>
          <div>
            <dt>单据张数</dt>
            <dd>{{ detail().receiptCount ?? '--' }}</dd>
          </div>
        } @else {
          <div>
            <dt>单据数量</dt>
            <dd>{{ detail().receiptCount ?? '--' }}</dd>
          </div>
        }
      </dl>
    </app-panel-card>
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }

      .panel-actions {
        display: inline-flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        flex-wrap: wrap;
      }

      .info-grid {
        margin: 0;
        padding: 16px 20px 20px;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px 28px;
      }

      .info-grid div {
        min-width: 0;
      }

      .info-grid__full {
        grid-column: 1 / -1;
      }

      dt {
        margin: 0 0 5px;
        color: var(--text-muted);
        font-size: 12.5px;
        line-height: 1.4;
      }

      dd {
        margin: 0;
        color: var(--text-primary);
        font-size: 14.5px;
        line-height: 1.55;
        word-break: break-word;
      }

      .mono {
        font-family: 'SF Mono', 'Fira Code', monospace;
      }

      @media (max-width: 720px) {
        .info-grid {
          grid-template-columns: 1fr;
          padding: 14px 16px 18px;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReimbursementBasicInfoPanelComponent {
  readonly detail = input.required<ReimbursementClaimDetail>();
  readonly canEdit = input(false);
  readonly exporting = input(false);
  readonly edit = output<void>();
  readonly preview = output<void>();
  readonly exportWord = output<void>();

  protected readonly statusLabel = reimbursementStatusLabel;
  protected readonly halfLabel = reimbursementHalfLabel;
}
