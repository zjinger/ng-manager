import {
  Component,
  Input,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTypographyModule } from 'ng-zorro-antd/typography';
import { NzIconModule } from 'ng-zorro-antd/icon';

export interface DiffRow {
  label: string;
  before: string;
  after: string;
}

@Component({
  selector: 'app-nginx-diff-modal',
  standalone: true,
  imports: [
    CommonModule,
    NzTableModule,
    NzTypographyModule,
    NzIconModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="diff-modal">
      <div class="diff-summary">
        <span nz-icon nzType="info-circle" nzTheme="outline"></span>
        <span>检测到 {{ diffs.length }} 项配置变更</span>
      </div>

      <nz-table
        #diffTable
        [nzData]="diffs"
        [nzShowPagination]="false"
        [nzSize]="'small'"
        nzTableLayout="fixed"
        class="diff-table"
      >
        <thead>
          <tr>
            <th nzWidth="120px">字段</th>
            <th nzWidth="260px">
              <span class="value-label before">原值</span>
            </th>
            <th nzWidth="260px">
              <span class="value-label after">新值</span>
            </th>
          </tr>
        </thead>
        <tbody>
          @for (row of diffTable.data; track row.label) {
            <tr>
              <td class="field-label">{{ row.label }}</td>
              <td class="field-value before-value">
                <span class="value-content" [class.is-empty]="!row.before || row.before === '空'">
                  {{ row.before || '空' }}
                </span>
              </td>
              <td class="field-value after-value">
                <span class="value-content" [class.is-empty]="!row.after || row.after === '空'">
                  {{ row.after || '空' }}
                </span>
              </td>
            </tr>
          }
        </tbody>
      </nz-table>

      @if (hiddenCount > 0) {
        <div class="diff-hidden-hint">
          <span nz-icon nzType="down-circle" nzTheme="outline"></span>
          还有 {{ hiddenCount }} 项变更未展开
        </div>
      }
    </div>
  `,
  styles: [`
    .diff-modal {
      padding: 8px 0;
    }

    .diff-summary {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      padding: 12px 16px;
      background: #f6ffed;
      border: 1px solid #b7eb8f;
      border-radius: 6px;
      color: #52c41a;
      font-size: 14px;
    }

    .diff-table {
      font-size: 13px;
    }

    .diff-table ::ng-deep .ant-table {
      border-radius: 6px;
      overflow: hidden;
    }

    .diff-table ::ng-deep .ant-table-thead > tr > th {
      background: #fafafa;
      font-weight: 600;
      padding: 10px 12px;
      border-bottom: 1px solid #f0f0f0;
    }

    .diff-table ::ng-deep .ant-table-tbody > tr > td {
      padding: 10px 12px;
      border-bottom: 1px solid #f0f0f0;
      vertical-align: top;
    }

    .diff-table ::ng-deep .ant-table-tbody > tr:last-child > td {
      border-bottom: none;
    }

    .field-label {
      font-weight: 500;
      color: rgba(0, 0, 0, 0.85);
      white-space: nowrap;
    }

    .value-label {
      font-weight: 500;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
    }

    .value-label.before {
      background: #fff1f0;
      color: #ff4d4f;
    }

    .value-label.after {
      background: #f6ffed;
      color: #52c41a;
    }

    .field-value {
      word-break: break-all;
      max-width: 260px;
    }

    .value-content {
      display: block;
      white-space: pre-wrap;
      word-break: break-word;
      line-height: 1.6;
    }

    .value-content.is-empty {
      color: rgba(0, 0, 0, 0.25);
      font-style: italic;
    }

    .before-value .value-content {
      color: rgba(0, 0, 0, 0.65);
    }

    .after-value .value-content {
      color: #262626;
    }

    .diff-hidden-hint {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 12px;
      color: rgba(0, 0, 0, 0.45);
      font-size: 13px;
    }
  `],
})
export class NginxDiffModalComponent {
  @Input() diffs: DiffRow[] = [];
  @Input() hiddenCount = 0;
}