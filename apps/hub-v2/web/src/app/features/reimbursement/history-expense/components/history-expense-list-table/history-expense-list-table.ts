import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { DataTableComponent } from '@shared/ui';
import { HistoryExpenseItem } from '../../models';
@Component({
  selector: 'app-history-expense-list-table',
  standalone: true,
  imports: [
    DecimalPipe,
    NzButtonModule,
    NzIconModule,
    NzTagModule,
    NzToolTipModule,
    DataTableComponent,
  ],

  template: `
    <app-data-table>
      <!-- 表头 -->
      <div table-head class="table-head">
        <div>单据编号</div>
        <div>申请人</div>
        <div>部门</div>
        <div>类型</div>
        <div>事由</div>
        <div>金额</div>
        <div>我参与的节点</div>
        <div>我的动作</div>
        <div>处理时间</div>
        <div>当前状态</div>
        <div>当前节点</div>
        <div>操作</div>
      </div>

      <!-- 表体 -->
      <div table-body>
        @for (item of items(); track item.id) {
        <div class="table-row">
          <div class="cell code">{{ item.code }}</div>
          <div class="cell">{{ item.applicant }}</div>
          <div class="cell">{{ item.department }}</div>
          <div class="cell">
            <nz-tag [nzColor]="item.expenseType === 'travel' ? 'blue' : 'cyan'">
              {{ item.expenseType }}
            </nz-tag>
          </div>
          <div class="cell title">
            <span [nz-tooltip]="item.title">
              {{ item.title }}
            </span>
          </div>
          <div class="cell amount">¥{{ item.amount | number : '1.2-2' }}</div>
          <div class="cell">
            {{ item.roleNode }}
          </div>
          <div class="cell">
            <nz-tag [nzColor]="getActionColor(item.actionType)">
              {{ item.actionType }}
            </nz-tag>
          </div>
          <div class="cell">
            {{ item.handledTime }}
          </div>
          <div class="cell">
            <nz-tag [nzColor]="getStatusColor(item.status)">
              {{ item.status }}
            </nz-tag>
          </div>
          <div class="cell">
            {{ item.currentNode }}
          </div>
          <div class="cell actions">
            <button nz-button nzType="link" nzSize="small" (click)="view.emit(item)">查看</button>
            <button nz-button nzType="link" nzSize="small" (click)="export.emit(item)">导出</button>
          </div>
        </div>
        }
      </div>
    </app-data-table>
  `,

  styles: [
    `
      .table-head,
      .table-row {
        display: grid;
        grid-template-columns:
          140px
          90px
          100px
          100px
          minmax(240px, 1fr)
          120px
          120px
          100px
          160px
          100px
          120px
          120px;
        gap: 12px;
        align-items: center;
      }
      .table-head {
        padding: 12px 16px;
        background: var(--bg-subtle);
        font-size: 12px;
        font-weight: 700;
      }
      .table-row {
        padding: 14px 16px;
        border-bottom: 1px solid var(--border-color-soft);
      }
      .cell {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 13px;
      }
      .code {
        font-family: monospace;
        color: var(--primary-color);
        font-weight: 600;
      }
      .title {
        font-weight: 500;
      }
      .amount {
        font-weight: 700;
      }
      .actions {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      @media (max-width: 1200px) {
        .table-head,
        .table-row {
          min-width: 1600px;
        }
      }
    `,
  ],

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryExpenseListTableComponent {
  readonly items = input<HistoryExpenseItem[]>([]);

  readonly view = output<HistoryExpenseItem>();

  readonly export = output<HistoryExpenseItem>();

  getActionColor(action: string): string {
    const map: Record<string, string> = {
      approve: 'success',
      reject: 'error',
    };

    return map[action] || 'default';
  }

  getStatusColor(status: string): string {
    const map: Record<string, string> = {
      processing: 'processing',
      approved: 'success',
      rejected: 'error',
    };

    return map[status] || 'default';
  }
}
