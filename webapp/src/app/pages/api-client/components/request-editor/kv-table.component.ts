import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, computed } from '@angular/core';
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
      <div class="kv-toolbar">
        <div class="left">
          <button nz-button nzType="default" nzSize="small" (click)="addRow()">新增</button>
          <button nz-button nzType="default" nzSize="small" (click)="addBlankIfNone()">补一行</button>
        </div>

        <div class="right">
          <span class="hint">{{enabledCount()}} / {{rows.length || 0}} enabled</span>
          <button nz-button nzType="default" nzSize="small" (click)="clearDisabled()">清理禁用</button>
        </div>
      </div>

      <div class="kv-head">
        <div class="c-check"></div>
        <div class="c-key">{{keyLabel}}</div>
        <div class="c-val">{{valueLabel}}</div>
        <div class="c-op"></div>
      </div>

      <div class="kv-body">
        @for (r of safeRows(); track $index) {
          <div class="kv-row">
            <div class="c-check">
              <label nz-checkbox [ngModel]="r.enabled" (ngModelChange)="setEnabled($index, $event)"></label>
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

            <div class="c-op">
              <button nz-button nzType="text" nzSize="small" (click)="removeRow($index)">
                <span nz-icon nzType="delete"></span>
              </button>
            </div>
          </div>
        }

        @if(!safeRows().length){
          <div class="kv-empty">
            <div class="text">暂无条目</div>
            <button nz-button nzType="primary" nzSize="small" (click)="addRow()">新增一条</button>
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
      grid-template-columns: 40px 1fr 1fr 44px;
      gap:8px;
      padding:6px 0;
      font-size:12px;
      opacity:.75;
      border-bottom:1px solid #f0f0f0;
    }

    .kv-body{
      flex:1 1 auto;
      overflow:auto;
      padding:8px 0;
    }

    .kv-row{
      display:grid;
      grid-template-columns: 40px 1fr 1fr 44px;
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
export class KvTableComponent {
  @Input() rows: KvRow[] = [];
  @Output() rowsChange = new EventEmitter<KvRow[]>();

  @Input() keyLabel = 'Key';
  @Input() valueLabel = 'Value';
  @Input() keyPlaceholder = 'key';
  @Input() valuePlaceholder = 'value';

  safeRows = computed(() => Array.isArray(this.rows) ? this.rows : []);

  enabledCount = computed(() => this.safeRows().filter(x => x.enabled).length);

  private emit(next: KvRow[]) {
    this.rowsChange.emit(next);
  }

  addRow() {
    const next = [...this.safeRows(), { key: '', value: '', enabled: true }];
    this.emit(next);
  }

  addBlankIfNone() {
    if (this.safeRows().length) return;
    this.addRow();
  }

  removeRow(i: number) {
    const next = this.safeRows().filter((_, idx) => idx !== i);
    this.emit(next);
  }

  setEnabled(i: number, enabled: boolean) {
    const next = this.safeRows().map((r, idx) => idx === i ? { ...r, enabled } : r);
    this.emit(next);
  }

  setKey(i: number, key: string) {
    const next = this.safeRows().map((r, idx) => idx === i ? { ...r, key } : r);
    this.emit(next);
  }

  setValue(i: number, value: string) {
    const next = this.safeRows().map((r, idx) => idx === i ? { ...r, value } : r);
    this.emit(next);
  }

  clearDisabled() {
    const next = this.safeRows().filter(x => x.enabled);
    this.emit(next);
  }
}
