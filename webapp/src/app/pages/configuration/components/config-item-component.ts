import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { ConfigSchemaItem } from '../models';
import { NzSpaceModule } from 'ng-zorro-antd/space';
import { NzTableModule } from 'ng-zorro-antd/table';

@Component({
  selector: 'app-config-item-component',
  imports: [
    CommonModule,
    FormsModule,
    NzIconModule,
    NzSwitchModule,
    NzInputModule,
    NzSelectModule,
    NzSpaceModule,
    NzTableModule
  ],
  template: `
    <div class="config-item">
      <div class="meta">
        <div class="label">{{ item.label }}</div>
        @if(item.desc){
          <div class="desc">
            {{ item.desc }}
          </div>
        }
      </div>
      <div class="control">
        @switch (item.type) {
           @case ('input'){
            <input nz-input [ngModel]="value" (ngModelChange)="emit($event)" />
          }
          @case ('path'){
            <input nz-input [ngModel]="value" (ngModelChange)="emit($event)" />
          }
          @case('string')
          {
            <span>{{value}}</span>
          }
          @case('file')
          {
            <nz-space nzAlign="center">
              <nz-icon nzType="file" nzTheme="fill"></nz-icon>
              <span>{{value}}</span>
            </nz-space>
          }
          @case ('boolean'){
             <nz-switch [ngModel]="value" (ngModelChange)="emit($event)"> </nz-switch>
          }
          @case('select'){
            <nz-select [ngModel]="value" (ngModelChange)="emit($event)">
              @for (opt of options; track opt.value) {
                <nz-option [nzValue]="opt.value" [nzLabel]="opt.label"></nz-option>
              }
            </nz-select>
          }
          @case('array'){
            <!-- <span>数组类型配置项，暂不支持表单编辑</span> -->
             @if (isArrayObjectEditor()) {
              @for(row of arrayValue(); track $index) {
                <nz-space>
                  @if(arrayValue().length>1){
                    <span >{{$index + 1}}</span>
                  }
                  @for (f of arrayFields(); track f.key) {
                      <nz-icon nzType="file" nzTheme="fill"></nz-icon>
                      <span>
                        {{row?.[f.key!]}}
                      </span>
                      @if(f !== arrayFields()[arrayFields().length -1]){
                        <nz-icon nzType="arrow-right" nzTheme="outline"></nz-icon>
                      }
                  }
                </nz-space>
              }
            } @else {
              <span>数组类型配置项，暂不支持表单编辑</span>
            }
          }
          <!--object 类型的配置项-->
          @case('object'){
            @if (isObjectEditor()) {
              <div class="kv">
                @for (field of objectKv(); track field.value) {
                  <nz-space>
                    <span class="label">{{field.label}}:</span>
                    <span class="value">{{field.value}}</span>
                  </nz-space>
                }
              </div>
            }
          }
        }
      </div>
    </div>
  `,
  styles: [
    `
    .config-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      &:hover{
        background: var(--app-primary-2);
      }
      .meta {
        .label {
          font-weight: 500;
          opacity: 0.75;
        }
        .desc {
          font-size: 14px;
          margin-top: 4px;
          opacity: 0.55;
        }
      }
      .control {
        min-width: 200px;
        max-width: 600px;
        width: 60%;
        input[nz-input],nz-select {
          width: 100%;
        }
        .kv {
          display: flex;
          flex-direction: column;
          gap: 6px;
          width:100%;
        }
      }
    }
    `
  ],
})
export class ConfigItemComponent {
  @Input() item!: ConfigSchemaItem;
  @Input() value: any;
  @Output() valueChange = new EventEmitter<any>();
  @Input() options: { label: string; value: string }[] = [];
  emit(v: any) {
    this.valueChange.emit(v);
  }
  /* -- ------------- object -------------- */
  isObjectEditor(): boolean {
    return this.item?.type === 'object';
  }

  objectKv(): { label: string; value: string }[] {
    const obj = this.value ?? {};
    return Object.values(obj).map((k, idx) => {
      if (typeof k === 'string') {
        return { label: Object.keys(obj)[idx], value: k };
      }
      return { label: Object.keys(obj)[idx], value: JSON.stringify(k) };
    });
  }



  /* ---------------- array<object> MVP ---------------- */

  isArrayObjectEditor(): boolean {
    return (
      this.item?.type === 'array' &&
      this.item?.item?.type === 'object' &&
      Array.isArray(this.item?.item?.fields) &&
      this.item.item.fields.length > 0
    );
  }

  arrayFields(): ConfigSchemaItem[] {
    return (this.item?.item?.fields ?? []) as ConfigSchemaItem[];
  }

  arrayValue(): any[] {
    return Array.isArray(this.value) ? this.value : [];
  }

  addRow() {
    const fields = this.arrayFields();
    const row: any = {};
    for (const f of fields) {
      if (!f.key) continue;
      row[f.key] = f.default ?? '';
    }
    const next = [...this.arrayValue(), row];
    this.emit(next);
  }

  removeRow(i: number) {
    const arr = this.arrayValue();
    const next = arr.filter((_, idx) => idx !== i);
    this.emit(next);
  }

  updateCell(i: number, key: string, v: any) {
    const arr = this.arrayValue();
    const next = arr.map((row, idx) => {
      if (idx !== i) return row;
      return { ...(row ?? {}), [key]: v };
    });
    this.emit(next);
  }
}
