import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ConfigSchema, ConfigSchemaItem } from '../models';
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
            [value]="get(item)"
            (valueChange)="onValueChange($event, item)">
          </app-config-item-component>
          @if(item.children?.length){
            @for (child of item.children; track child.key) {
              <app-config-item-component
                [item]="child"
                [options]="child.options || options[child.optionsRef?.key!] || []"
                [value]="getChild(child,item)"
                (valueChange)="onValueChange($event, child)">
              </app-config-item-component>
            }
          }

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

  get(item: ConfigSchemaItem) {
    const v = getByPath(this.vm, item.key);
    return (v === undefined || v === null) ? item.default : v;
  }

  getChild(child: ConfigSchemaItem, parent: ConfigSchemaItem) {
    const parentValue = this.get(parent);
    if (parentValue === undefined || parentValue === null || parentValue === "") {
      return child.default;
    }
    const replacedPath = this.resolveDynamicPath(child.key, parent.key, parentValue);
    const v = getByPath(this.vm, replacedPath);
    return (v === undefined || v === null) ? child.default : v;
  }

  onValueChange(value: any, item: ConfigSchemaItem) {
    const path = this.resolvePathForWrite(item);
    this.update(path, value);
  }

  private resolvePathForWrite(item: ConfigSchemaItem): string {
    const key = item.key || "";
    // 处理 "<parentKey>" 这种占位符：从当前 vm 里读取对应 parent 的值
    // 约定：占位符里写的是完整 parent.key，例如 "<serve.defaultConfiguration>"
    const m = key.match(/<([^>]+)>/);
    if (!m) return key;

    const parentKey = m[1];
    const parentValue = getByPath(this.vm, parentKey);
    return this.resolveDynamicPath(key, parentKey, parentValue);
  }

  private resolveDynamicPath(key: string, placeholderKey: string, placeholderValue: any): string {
    const token = `<${placeholderKey}>`;
    return key.replace(token, String(placeholderValue ?? ""));
  }

  private update(path: string, value: any) {
    const next = structuredClone(this.vm);
    setByPath(next, path, value);
    this.vmChange.emit(next);
  }
}
