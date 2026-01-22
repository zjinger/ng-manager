import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { ConfigItem } from '../models/config.model';

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
          @case ('boolean'){
             <nz-switch [ngModel]="value" (ngModelChange)="emit($event)"> </nz-switch>
          }
          @case('select'){
            <nz-select [ngModel]="value" (ngModelChange)="emit($event)">
              @for (opt of options; track opt) {
                <nz-option [nzValue]="opt" [nzLabel]="opt"></nz-option>
              }
            </nz-select>
          }
          @case('file'){

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
      padding: 12px 0;
      .meta {
        .label {
          font-weight: 500;
          font-size: 14px;
        }
        .desc {
          font-size: 12px;
          color: #888;
          margin-top: 4px;
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
  @Input() item!: ConfigItem;
  @Input() value: any;
  @Output() valueChange = new EventEmitter<any>();
  @Input() options: string[] = [];
  emit(v: any) {
    this.valueChange.emit(v);
  }
}
