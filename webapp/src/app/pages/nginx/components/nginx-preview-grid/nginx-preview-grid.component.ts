import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';

export type PreviewCellTone = 'ok' | 'warn' | 'info' | 'danger' | 'default';

export interface NginxPreviewCell {
  text: string;
  tone?: PreviewCellTone;
}

export interface NginxPreviewGridColumn {
  key: string;
  title: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  mono?: boolean;
}

type PreviewCellValue = string | number | NginxPreviewCell | null | undefined;

@Component({
  selector: 'app-nginx-preview-grid',
  standalone: true,
  imports: [CommonModule, NzSpinModule, NzIconModule],
  template: `
    <div class="preview-grid-shell">
      <div class="preview-grid-head" [style.grid-template-columns]="gridTemplate">
        @for (column of columns; track column.key) {
          <div class="cell" [class.align-right]="column.align === 'right'" [class.align-center]="column.align === 'center'">
            {{ column.title }}
          </div>
        }
      </div>

      <nz-spin [nzSpinning]="loading">
        <div class="preview-grid-body">
          @if (!loading && !rows.length) {
            <div class="empty-state">
              <nz-icon nzType="inbox" nzTheme="outline" class="empty-icon"></nz-icon>
              <p>{{ emptyText }}</p>
            </div>
          } @else {
            @for (row of rows; track rowTrack($index, row)) {
              <div class="preview-grid-row" [style.grid-template-columns]="gridTemplate">
                @for (column of columns; track column.key) {
                  @let cell = getCell(row, column.key);
                  <div
                    class="cell cell-value"
                    [class.align-right]="column.align === 'right'"
                    [class.align-center]="column.align === 'center'"
                    [class.mono]="column.mono"
                  >
                    @if (isCellObject(cell)) {
                      <span class="cell-tag" [ngClass]="toneClass(cell.tone)">
                        {{ cell.text }}
                      </span>
                    } @else {
                      {{ stringifyCell(cell) }}
                    }
                  </div>
                }
              </div>
            }
          }
        </div>
      </nz-spin>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .preview-grid-shell {
      border: 1px solid rgba(0, 0, 0, 0.06);
      border-radius: 6px;
      overflow: hidden;
      background: #fff;
    }

    .preview-grid-head,
    .preview-grid-row {
      display: grid;
      column-gap: 8px;
      align-items: center;
      padding: 0 12px;
    }

    .preview-grid-head {
      min-height: 42px;
      background: #fafafa;
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);

      .cell {
        font-size: var(--nginx-font-size-sm, 12px);
        color: rgba(0, 0, 0, 0.45);
        letter-spacing: 0.4px;
        font-weight: 700;
        text-transform: uppercase;
      }
    }

    .preview-grid-row {
      min-height: 52px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.05);
      transition: background 120ms ease;

      &:last-child {
        border-bottom: none;
      }

      &:hover {
        background: rgba(0, 0, 0, 0.02);
      }
    }

    .cell {
      min-width: 0;
    }

    .cell-value {
      font-size: var(--nginx-font-size-base, 14px);
      color: rgba(0, 0, 0, 0.72);
    }

    .cell-value.mono {
      font-family: var(--nginx-font-family-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace);
      font-size: var(--nginx-font-size-sm, 12px);
    }

    .align-right {
      justify-self: end;
      text-align: right;
    }

    .align-center {
      justify-self: center;
      text-align: center;
    }

    .cell-tag {
      display: inline-flex;
      align-items: center;
      border-radius: 4px;
      padding: 2px 8px;
      font-size: var(--nginx-font-size-sm, 12px);
      font-weight: 600;

      &.tone-default {
        color: rgba(0, 0, 0, 0.65);
        background: rgba(0, 0, 0, 0.06);
      }

      &.tone-ok {
        color: #00b42a;
        background: rgba(0, 180, 42, 0.12);
      }

      &.tone-info {
        color: #165dff;
        background: rgba(22, 93, 255, 0.12);
      }

      &.tone-warn {
        color: #ff7d00;
        background: rgba(255, 125, 0, 0.14);
      }

      &.tone-danger {
        color: #f53f3f;
        background: rgba(245, 63, 63, 0.12);
      }
    }

    .empty-state {
      text-align: center;
      padding: 40px 0;

      .empty-icon {
        font-size: 42px;
        color: rgba(0, 0, 0, 0.2);
        margin-bottom: 12px;
      }

      p {
        margin: 0;
        color: rgba(0, 0, 0, 0.45);
      }
    }

    @media (max-width: 1100px) {
      .preview-grid-head {
        display: none;
      }

      .preview-grid-row {
        grid-template-columns: 1fr !important;
        gap: 8px;
        align-items: stretch;
        padding: 12px;
      }

      .align-right,
      .align-center {
        justify-self: start;
        text-align: left;
      }
    }
  `],
})
export class NginxPreviewGridComponent {
  @Input() columns: NginxPreviewGridColumn[] = [];
  @Input() rows: Array<Record<string, PreviewCellValue>> = [];
  @Input() loading = false;
  @Input() emptyText = '暂无数据';
  @Input() trackByKey = 'id';

  get gridTemplate(): string {
    if (!this.columns.length) {
      return '1fr';
    }

    return this.columns.map(column => column.width || 'minmax(0, 1fr)').join(' ');
  }

  rowTrack(index: number, row: Record<string, PreviewCellValue>): string | number {
    return (row?.[this.trackByKey] as string | number | undefined) ?? index;
  }

  getCell(row: Record<string, PreviewCellValue>, key: string): PreviewCellValue {
    return row?.[key];
  }

  stringifyCell(value: PreviewCellValue): string {
    if (value === null || value === undefined || value === '') {
      return '—';
    }
    return String(value);
  }

  isCellObject(value: PreviewCellValue): value is NginxPreviewCell {
    return typeof value === 'object' && value !== null && 'text' in value;
  }

  toneClass(tone?: PreviewCellTone): string {
    return `tone-${tone || 'default'}`;
  }
}

