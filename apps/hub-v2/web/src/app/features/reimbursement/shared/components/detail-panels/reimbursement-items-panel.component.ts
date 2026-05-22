import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { ReimbursementClaimDetail, ReimbursementItemEntity, TravelReimbursementItemMeta } from '@app/features/reimbursement/models/reimbursement.model';
import { PanelCardComponent } from '@app/shared/ui';
import {
  reimbursementGrandTotalCell,
  reimbursementLocationLabel,
  reimbursementMoneyCell,
  reimbursementNumberCell,
  reimbursementTravelMetaNumber,
  reimbursementTravelSubtotal,
} from '../../utils/reimbursement-detail-display.util';
import { sumMoney } from '../../utils/reimbursement-money.util';

@Component({
  selector: 'app-reimbursement-items-panel',
  standalone: true,
  imports: [PanelCardComponent],
  template: `
    <app-panel-card [title]="title()" [empty]="detail().items.length === 0" emptyText="暂无明细">
      @if (detail().claimType === 'travel') {
        <div class="table-wrapper">
          <table class="expense-table expense-table--travel">
            <thead>
              <tr>
                <th>日期</th>
                <th>起讫地点</th>
                <th>天数</th>
                <th>机票</th>
                <th>车船</th>
                <th>市内交通</th>
                <th>住宿</th>
                <th>餐补</th>
                <th>餐费</th>
                <th>其他</th>
                <th>小计</th>
              </tr>
            </thead>
            <tbody>
              @for (item of detail().items; track item.id) {
                <tr>
                  <td>{{ item.occurredDate || '' }}</td>
                  <td>{{ locationLabel(item) }}</td>
                  <td>{{ numberCell(travelMetaNumber(item, 'days')) }}</td>
                  <td>{{ moneyCell(travelMetaNumber(item, 'airfareAmount')) }}</td>
                  <td>{{ moneyCell(travelMetaNumber(item, 'carriageAmount')) }}</td>
                  <td>{{ moneyCell(travelMetaNumber(item, 'localTransportAmount')) }}</td>
                  <td>{{ moneyCell(travelMetaNumber(item, 'lodgingAmount')) }}</td>
                  <td>{{ moneyCell(travelMetaNumber(item, 'mealAllowanceAmount')) }}</td>
                  <td>{{ moneyCell(travelMetaNumber(item, 'mealAmount')) }}</td>
                  <td>{{ moneyCell(travelMetaNumber(item, 'otherAmount')) }}</td>
                  <td class="expense-table__amount">{{ moneyCell(travelSubtotal(item)) }}</td>
                </tr>
              }
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" class="expense-table__total-label">合计</td>
                <td>{{ numberCell(travelTotal('days')) }}</td>
                <td>{{ moneyCell(travelTotal('airfareAmount')) }}</td>
                <td>{{ moneyCell(travelTotal('carriageAmount')) }}</td>
                <td>{{ moneyCell(travelTotal('localTransportAmount')) }}</td>
                <td>{{ moneyCell(travelTotal('lodgingAmount')) }}</td>
                <td>{{ moneyCell(travelTotal('mealAllowanceAmount')) }}</td>
                <td>{{ moneyCell(travelTotal('mealAmount')) }}</td>
                <td>{{ moneyCell(travelTotal('otherAmount')) }}</td>
                <td class="expense-table__grand-total">{{ grandTotalCell(detail().totalAmount) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      } @else {
        <div class="table-wrapper">
          <table class="expense-table expense-table--general">
            <thead>
              <tr>
                <th>序号</th>
                <th>用途</th>
                <th>金额（元）</th>
              </tr>
            </thead>
            <tbody>
              @for (item of detail().items; track item.id; let idx = $index) {
                <tr>
                  <td class="expense-table__seq">{{ idx + 1 }}</td>
                  <td>{{ item.description || '' }}</td>
                  <td class="expense-table__amount">{{ moneyCell(item.amount) }}</td>
                </tr>
              }
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" class="expense-table__total-label">合计</td>
                <td class="expense-table__grand-total">{{ moneyCell(detail().totalAmount) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      }
    </app-panel-card>
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }

      .table-wrapper {
        padding: 16px 20px 20px;
        max-width: 100%;
        overflow-x: auto;
      }

      .expense-table {
        width: 100%;
        border-collapse: collapse;
        color: var(--text-primary);
        font-size: 13px;
      }

      .expense-table--travel {
        min-width: 980px;
      }

      .expense-table--general {
        min-width: 520px;
      }

      .expense-table th,
      .expense-table td {
        border: 1px solid var(--border-color-soft);
        padding: 10px 8px;
        text-align: left;
        vertical-align: middle;
        white-space: nowrap;
      }

      .expense-table th {
        background: var(--bg-subtle);
        color: var(--text-secondary);
        font-weight: 700;
      }

      .expense-table tfoot td {
        background: var(--bg-subtle);
        font-weight: 700;
      }

      .expense-table__seq {
        color: var(--text-muted);
        text-align: center;
      }

      .expense-table__amount {
        font-family: 'SF Mono', 'Fira Code', monospace;
        font-weight: 700;
      }

      .expense-table__total-label {
        text-align: right;
      }

      .expense-table__grand-total {
        color: #f5222d;
        font-weight: 700;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReimbursementItemsPanelComponent {
  readonly detail = input.required<ReimbursementClaimDetail>();

  readonly title = computed(() => (this.detail().claimType === 'travel' ? '行程与费用明细' : '费用明细'));

  protected readonly locationLabel = reimbursementLocationLabel;
  protected readonly travelMetaNumber = reimbursementTravelMetaNumber;
  protected readonly travelSubtotal = reimbursementTravelSubtotal;
  protected readonly moneyCell = reimbursementMoneyCell;
  protected readonly numberCell = reimbursementNumberCell;
  protected readonly grandTotalCell = reimbursementGrandTotalCell;

  protected travelTotal(key: keyof TravelReimbursementItemMeta): number {
    return sumMoney(this.detail().items.map((item) => reimbursementTravelMetaNumber(item, key)));
  }
}
