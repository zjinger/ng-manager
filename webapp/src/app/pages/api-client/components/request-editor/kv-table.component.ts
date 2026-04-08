import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiRequestKvRow } from '@models/api-client';
import { uniqueId } from 'lodash';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

/**
 * 生成唯一的行 ID
 */
function generateRowId(): string {
  return `kv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

@Component({
  selector: 'app-kv-table',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzButtonModule,
    NzCheckboxModule,
    NzInputModule,
    NzIconModule,
    NzTooltipModule
  ],
  template: `
    <div class="kv-wrap">
      <div class="kv-head">
        <div class="c-check">
          @if(keepTrailingBlank){
            <label nz-checkbox [ngModel]="isAllEnabled()"
              (ngModelChange)="toggleEnabled($event); "
            ></label>
          }
        </div>
        <div class="c-key">{{keyLabel}}</div>
        <div class="c-val">{{valueLabel}}</div>
        <div class="c-des">{{descriptionLabel}}</div>
        <div class="c-op"></div>
      </div>
      <div class="kv-body">
        @for (r of rows; let idx = $index; track r.id) {
          <div class="kv-row">
            <div class="c-check">
              <label nz-checkbox [ngModel]="r.enabled" [nzDisabled]="!keepTrailingBlank" (ngModelChange)="setEnabled($index, $event)"></label>
            </div>
            <div class="c-key" [nz-tooltip]="!keepTrailingBlank ? '自动提取Url 中的 Path 参数，支持{param} 与 :param' : ''">
              <input
                nz-input
                [readonly]="!keepTrailingBlank"
                [placeholder]="keyPlaceholder"
                [ngModel]="r.key"
                (ngModelChange)="setKey(idx, $event)"
              />
            </div>
            <div class="c-val">
              <input
                nz-input
                [placeholder]="valuePlaceholder"
                [ngModel]="r.value"
                (ngModelChange)="setValue(idx, $event)"
              />
            </div>
            <div class="c-des">
              <input
                nz-input
                [placeholder]="descriptionLabel"
                [ngModel]="r.description"
                (ngModelChange)="setDescription(idx, $event)"
              />
            </div>
            <div class="c-op">
              <button nz-button nzType="text" (click)="removeRow(idx)" nz-tooltip nzTooltipTitle="删除">
                <nz-icon nzType="minus-circle" nzTheme="outline" />
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .kv-wrap{ display:flex; flex-direction:column; height:100%; }
    .kv-toolbar{
      padding:8px 0;
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:10px;
    }
    .kv-toolbar .left, .kv-toolbar .right{ display:flex; gap:8px; align-items:center; }
    .hint{ font-size:12px; opacity:.7; }

    .kv-head{
      display:grid;
      grid-template-columns: 40px 1fr 1fr 2fr 44px;
      gap:8px;
      padding:6px 0;
      font-size:14px;
      border-bottom:1px solid #f0f0f0;
      align-items:center;
      .c-key, .c-val, .c-des{
        opacity:.75;
      }
    }

    .kv-body{
      flex:1 1 auto;
      overflow:auto;
      padding:8px 0;
    }

    .kv-row{
      display:grid;
      grid-template-columns: 40px 1fr 1fr 2fr 44px;
      gap:8px;
      align-items:center;
      padding:6px 0;
      border-bottom:1px dashed #f0f0f0;
    }

    .c-check{ display:flex; justify-content:center; }
    .c-op{ display:flex; justify-content:center; }

    .kv-empty{
      padding:16px;
      opacity:.75;
      display:flex;
      align-items:center;
      justify-content:space-between;
      border:1px dashed #e8e8e8;
      border-radius:8px;
      margin-top:8px;
    }
  `],
})
export class KvTableComponent implements OnChanges {
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['rows']) {
      this.rows = this.withTrailingBlank(this.ensureRowIds(this.rows));
    }
  }
  @Input() rows: ApiRequestKvRow[] = [];
  @Output() rowsChange = new EventEmitter<ApiRequestKvRow[]>();

  @Input() keyLabel = 'Key';
  @Input() valueLabel = 'Value';
  @Input() keyPlaceholder = 'key';
  @Input() valuePlaceholder = 'value';
  @Input() descriptionLabel = 'Description';

  @Input() keepTrailingBlank = true;

  enabledCount = computed(() => this.rows.filter(x => x.enabled).length);

  isAllEnabled(): boolean {
    return this.rows.length > 0 && this.rows.every(x => x.enabled);
  }

  toggleEnabled(checked: boolean) {
    const next = this.rows.map(r => ({ ...r, enabled: checked }));
    this.emit(next);
  }
  private emit(next: ApiRequestKvRow[]) {
    this.rowsChange.emit(next);
  }

  /**
   * 确保所有行都有唯一 ID
   */
  private ensureRowIds(rows: ApiRequestKvRow[]): ApiRequestKvRow[] {
    return rows.map(r => {
      if (!r.id || r.id.trim() === '') {
        return { ...r, id: generateRowId() };
      }
      return r;
    });
  }

  private withTrailingBlank(rows: ApiRequestKvRow[]) {
    return this.keepTrailingBlank ? this.ensureTrailingBlank(rows) : rows;
  }

  private createBlankRow(): ApiRequestKvRow {
    return { id: generateRowId(), key: '', value: '', description: '', enabled: true };
  }

  private isBlankRow(r: ApiRequestKvRow | undefined | null): boolean {
    if (!r) return true;
    const k = (r.key ?? '').trim();
    const v = (r.value ?? '').trim();
    const d = (r.description ?? '').trim();
    return !k && !v && !d;
  }
  /** 核心：保证末尾永远有一行空白行 */
  private ensureTrailingBlank(rows: ApiRequestKvRow[]): ApiRequestKvRow[] {
    const list = Array.isArray(rows) ? rows : [];
    if (list.length === 0) return [this.createBlankRow()];

    const last = list[list.length - 1];
    if (this.isBlankRow(last)) return list;

    return [...list, this.createBlankRow()];
  }

  /** 轻量比较：同引用直接认为相同；否则只比较长度+最后一行是否空白（避免频繁 emit） */
  private sameRowsRefOrContent(a: ApiRequestKvRow[], b: ApiRequestKvRow[]): boolean {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    // 只用来阻止 ngOnChanges 的兜底 emit 抖动
    const aLastBlank = this.isBlankRow(a[a.length - 1]);
    const bLastBlank = this.isBlankRow(b[b.length - 1]);
    return aLastBlank === bLastBlank;
  }

  removeRow(i: number) {
    const base = this.rows.filter((_, idx) => idx !== i);
    this.emit(this.withTrailingBlank(base));
  }

  setEnabled(i: number, enabled: boolean) {
    const base = this.rows.map((r, idx) => idx === i ? { ...r, enabled } : r);
    this.emit(base);
  }

  setValue(i: number, value: string) {
    this.patchRow(i, { value });
  }

  setKey(i: number, key: string) {
    this.patchRow(i, { key });
  }

  setDescription(i: number, description: string) {
    this.patchRow(i, { description });
  }

  private patchRow(i: number, partial: Partial<ApiRequestKvRow>) {
    const base = this.rows.map((r, idx) => idx === i ? { ...r, ...partial } : r);
    this.emit(this.withTrailingBlank(base));
  }

  addRow() {
    const base = [...this.rows, this.createBlankRow()];
    this.emit(this.withTrailingBlank(base));
  }

  clearDisabled() {
    const base = this.rows.filter(x => x.enabled);
    this.emit(this.withTrailingBlank(base));
  }

}
