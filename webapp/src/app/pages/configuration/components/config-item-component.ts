import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { ConfigSchemaItem } from '../models';

@Component({
  selector: 'app-config-item-component',
  imports: [
    CommonModule,
    FormsModule,
    NzIconModule,
    NzSwitchModule,
    NzInputModule,
    NzSelectModule
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
          @case ('path'){
            <input nz-input [ngModel]="value" (ngModelChange)="emit($event)" />
          }
          @case('string')
          {
            <input nz-input [ngModel]="value" (ngModelChange)="emit($event)" />
          }
          @case('file')
          {
            <input nz-input [ngModel]="value" (ngModelChange)="emit($event)" />
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
        max-width: 400px;
        width: 40%;
        input[nz-input],nz-select {
          width: 100%;
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
}
