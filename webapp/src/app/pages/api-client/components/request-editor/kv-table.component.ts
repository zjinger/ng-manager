import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { KvRow } from '@models/api-request.model';

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
  ],
  template: `
    <div class="kv-wrap">
      <div class="kv-head">
        <div class="c-check">
          @if(isCheckBoxAllowed){
            <label  nz-checkbox [ngModel]="isAllEnabled()"
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
        @for (r of rows; track $index) {
          <div class="kv-row">
            <div class="c-check">
              <label nz-checkbox [ngModel]="r.enabled" [nzDisabled]="!isCheckBoxAllowed" (ngModelChange)="setEnabled($index, $event)"></label>
            </div>
            <div class="c-key">
              <input
                nz-input
                [placeholder]="keyPlaceholder"
                [ngModel]="r.key"
                (ngModelChange)="setKey($index, $event)"
              />
            </div>
            <div class="c-val">
              <input
                nz-input
                [placeholder]="valuePlaceholder"
                [ngModel]="r.value"
                (ngModelChange)="setValue($index, $event)"
              />
            </div>
            <div class="c-des">
              <input
                nz-input
                [placeholder]="descriptionLabel"
                [ngModel]="r.description"
                (ngModelChange)="setDescription($index, $event)"
              />
            </div>
            <div class="c-op">
              <button nz-button nzType="text" (click)="removeRow($index)">
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
  @Input() rows: KvRow[] = [];
  @Output() rowsChange = new EventEmitter<KvRow[]>();

  @Input() keyLabel = 'Key';
  @Input() valueLabel = 'Value';
  @Input() keyPlaceholder = 'key';
  @Input() valuePlaceholder = 'value';
  @Input() descriptionLabel = 'Description';
  @Input() isCheckBoxAllowed = true;

  enabledCount = computed(() => this.rows.filter(x => x.enabled).length);

  isAllEnabled(): boolean {
    return this.rows.length > 0 && this.rows.every(x => x.enabled);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['rows']) {
      const next = this.ensureTrailingBlank(this.rows);
      const curRows = changes['rows'].currentValue as KvRow[];
      // 只有在内容不同时才 emit，避免死循环
      const isSameRow = this.sameRowsRefOrContent(curRows, next);
      if (!isSameRow) {
        this.emit(next);
      }
    }
  }
  toggleEnabled(checked: boolean) {
    const next = this.rows.map(r => ({ ...r, enabled: checked }));
    this.emit(next);
  }
  private emit(next: KvRow[]) {
    this.rowsChange.emit(next);
  }

  private createBlankRow(): KvRow {
    return { key: '', value: '', description: '', enabled: true };
  }

  private isBlankRow(r: KvRow | undefined | null): boolean {
    if (!r) return true;
    const k = (r.key ?? '').trim();
    const v = (r.value ?? '').trim();
    const d = (r.description ?? '').trim();
    return !k && !v && !d;
  }
  /** 核心：保证末尾永远有一行空白行 */
  private ensureTrailingBlank(rows: KvRow[]): KvRow[] {
    const list = Array.isArray(rows) ? rows : [];
    if (list.length === 0) return [this.createBlankRow()];

    const last = list[list.length - 1];
    if (this.isBlankRow(last)) return list;

    return [...list, this.createBlankRow()];
  }

  /** 轻量比较：同引用直接认为相同；否则只比较长度+最后一行是否空白（避免频繁 emit） */
  private sameRowsRefOrContent(a: KvRow[], b: KvRow[]): boolean {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    // 只用来阻止 ngOnChanges 的兜底 emit 抖动
    const aLastBlank = this.isBlankRow(a[a.length - 1]);
    const bLastBlank = this.isBlankRow(b[b.length - 1]);
    return aLastBlank === bLastBlank;
  }


  removeRow(i: number) {
    const base = this.rows.filter((_, idx) => idx !== i);
    const next = this.ensureTrailingBlank(base);
    this.emit(next);
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

  private patchRow(i: number, partial: Partial<KvRow>) {
    const base = this.rows.map((r, idx) => idx === i ? { ...r, ...partial } : r);
    const next = this.ensureTrailingBlank(base);
    this.emit(next);
  }

  addRow() {
    const base = [...this.rows, this.createBlankRow()];
    const next = this.ensureTrailingBlank(base);
    this.emit(next);
  }

  clearDisabled() {
    const base = this.rows.filter(x => x.enabled);
    const next = this.ensureTrailingBlank(base);
    this.emit(next);
  }

}
