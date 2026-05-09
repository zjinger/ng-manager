import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ConfigField, ConfigSchema } from '../models';
import { getByPath, setByPath } from '../utils';
import { ConfigItemComponent } from './config-item-component';

@Component({
  selector: 'app-config-section-component',
  standalone: true,
  imports: [CommonModule, ConfigItemComponent],
  template: `
  @if(schema){
    @let groups = schema.groups || [];
    @for (sec of groups; track sec.key) {
      <section class="section" [attr.id]="sec.key">
        <h3 class="section-title">{{ sec.title }}</h3>
        @for (item of sec.fields; track item.key) {
          <app-config-item-component
            [item]="item"
            [options]="item.options || []"
            [value]="get(item)"
            (valueChange)="onValueChange($event, item)">
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

  get(item: ConfigField) {
    const directValue = getByPath(this.vm, item.path);
    if (directValue !== undefined) {
      return directValue;
    }

    const fallbackPaths = this.getFallbackPaths(item);
    for (const fallbackPath of fallbackPaths) {
      const fallbackValue = getByPath(this.vm, fallbackPath);
      if (fallbackValue !== undefined) {
        return fallbackValue;
      }
    }

    return this.getDefaultValue(item);
  }

  onValueChange(value: any, item: ConfigField) {
    const path = item.path;
    this.update(path, value);
  }

  private update(path: string, value: any) {
    const base = this.vm ?? {};
    const next = structuredClone(base);
    const updated = setByPath(next, path, value);
    this.vmChange.emit(updated ?? next);
  }

  private getFallbackPaths(item: ConfigField): string[] {
    const metadata = (item.metadata ?? {}) as { fallbackPaths?: unknown };
    if (!Array.isArray(metadata.fallbackPaths)) {
      return [];
    }
    return metadata.fallbackPaths.filter((path): path is string => typeof path === "string");
  }

  private getDefaultValue(item: ConfigField): unknown {
    const metadata = (item.metadata ?? {}) as { defaultValue?: unknown };
    return metadata.defaultValue;
  }
}
