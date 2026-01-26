import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { ConfigSchema } from '../models';
import { getByPath, setByPath } from '../utils';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-config-schema',
  imports: [
    CommonModule,
    FormsModule,
    NzSwitchModule,
    NzInputModule,
    NzSelectModule
  ],
  template: `
  @if(!schema) {
    <div class="empty">
      未加载配置模型
    </div>
  } @else {
     @for (sec of schema.sections; track sec.id) {
      <section class="section">
        <h3>{{ sec.label }}</h3>

        @for (item of sec.items; track item.key) {
          <label>{{ item.label }}</label>

          @switch (item.type) {
            @case ("string") {
              <input
                nz-input
                [value]="get(item.key!)"
                (input)="update(item.key!, $any($event.target).value)" />
            }

            @case ("boolean") {
              <nz-switch
                [ngModel]="get(item.key!)"
                (ngModelChange)="update(item.key!, $event)" />
            }

            @case ("select") {
              <nz-select
                [ngModel]="get(item.key!)"
                (ngModelChange)="update(item.key!, $event)">
                @for (o of options[item.optionsRef?.key!] ?? []; track o.value) {
                  <nz-option [nzLabel]="o.label" [nzValue]="o.value" />
                }
              </nz-select>
            }
          }
        }
      </section>
    }
  }
  `,
  styles: ``,
})
export class ConfigSchemaComponent {
  @Input() schema?: ConfigSchema;
  @Input() vm!: any;
  @Input() options: Record<string, any> = {};
  @Output() vmChange = new EventEmitter<any>();

  get(path: string) {
    return getByPath(this.vm, path);
  }

  update(path: string, value: any) {
    const next = structuredClone(this.vm);
    setByPath(next, path, value);
    this.vmChange.emit(next);
  }
}
