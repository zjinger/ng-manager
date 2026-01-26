import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ConfigSchema } from '../models';
import { getByPath, setByPath } from '../utils';
import { ConfigItemComponent } from './config-item-component';

@Component({
  selector: 'app-config-section-component',
  standalone: true,
  imports: [CommonModule, ConfigItemComponent],
  template: `
  @if(schema){
    @let sections = schema.sections || [];
    @for (sec of sections; track sec.id) {
      <section class="section" [attr.id]="sec.id">
        <h3 class="section-title">{{ sec.label }}</h3>
        @for (item of sec.items; track item.key) {
          <app-config-item-component
            [item]="item"
            [options]="item.options || options[item.optionsRef?.key!] || []"
            [value]="get(item.key)"
            (valueChange)="onValueChange($event, item.key)">
          </app-config-item-component>
        }
      </section>
  }
  }@else{
    <div class="empty">
      该配置暂不支持表单模式（可切换 Raw / 或稍后实现 provider）
    </div>
  }
  `,
  styles: [`
    .section { padding: 0px; } 
    .section:last-child { border-bottom: none; }
    .section-title { margin: 0 0 10px; font-size: 24px; opacity: 0.85; font-weight: 500; padding: 0 16px; }
    .empty { padding: 12px 14px;}
  `],
})
export class ConfigSectionComponent {
  @Input() schema?: ConfigSchema;
  @Input() vm!: any;
  @Input() options: Record<string, any> = {};
  @Output() vmChange = new EventEmitter<any>();

  get(path: string) {
    const v = getByPath(this.vm, path);
    return v;
  }

  onValueChange(value: any, path: string) {
    this.update(path, value);
  }

  private update(path: string, value: any) {
    const next = structuredClone(this.vm);
    setByPath(next, path, value);
    this.vmChange.emit(next);
  }
}
