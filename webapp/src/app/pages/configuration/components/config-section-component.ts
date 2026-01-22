import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ConfigFileType, ConfigSchemaItem, ConfigSchema, ConfigTreeNode } from '../models';
import { ConfigItemComponent } from './config-item-component';

@Component({
  selector: 'app-config-section-component',
  standalone: true,
  imports: [CommonModule, ConfigItemComponent],
  template: `
   @for (n of fileNodes; track n.id) {
     <div class="file-block">
        <div class="file-head">
          <div class="file-title">{{ n.label }}</div>
          @if (n.description) {
            <div class="file-desc">{{ n.description }}</div>
          }
        </div>
        @let fileType = n.file?.type;
        @if (fileType && schemas && schemas[fileType]) {
          @let schema = schemas[fileType];
          @let values = valuesByType[fileType] || {};
          @for (sec of schema.sections; track sec.id) {
            <section class="section" [attr.id]="fileType + ':' + sec.id">
              <!-- <h3 class="section-title">{{ sec.label }}</h3> -->
              @for (item of sec.items; track item.key) {
                <app-config-item-component
                  [item]="item"
                  [options]="getOptions(fileType, item)"
                  [value]="values[item.key]"
                  (valueChange)="onChange(fileType, item.key, $event, values)">
                </app-config-item-component>
              }
            </section>
          }
        } @else {
          <div class="empty">
            该配置暂不支持表单模式（可切换 Raw / 或稍后实现 provider）
          </div>
        }
      </div>
  }
  `,
  styles: [`
     .file-block {
      border: 1px solid rgba(0,0,0,0.06);
      border-radius: 10px;
      margin-bottom: 14px;
      overflow: hidden;
    }
    .file-head {
      padding: 12px 16px;
      background: rgba(0,0,0,0.02);
      border-bottom: 1px solid rgba(0,0,0,0.06);
    }
    .file-title {  font-size: 24px; font-weight: 500;}
    .file-desc { color: #888; font-size: 14px; margin-top: 4px; }

    .section { padding: 0px; } //border-bottom: 1px solid rgba(0,0,0,0.06); 
    .section:last-child { border-bottom: none; }
    .section-title { margin: 0 0 10px; font-size: 18px;font-weight: 500; padding: 0 16px; }

    .empty { padding: 12px 14px; color: #999; }
  `],
})
export class ConfigSectionComponent {
  /** 右侧一次展示的“所有 file 节点” */
  @Input() fileNodes: ConfigTreeNode[] = [];

  /** schemas[type] */
  @Input() schemas: Record<ConfigFileType, ConfigSchema> | null = null;

  /** valuesByType[type] = {key:value} */
  @Input() valuesByType: Record<string, Record<string, any>> = {};

  /** vmOptionsByType[type] = {...} */
  @Input() vmOptionsByType: Record<string, any> = {};

  /** 回传：哪个 type 的 values 变了 */
  @Output() valuesChange = new EventEmitter<{ type: string; values: Record<string, any> }>();

  onChange(type: string, key: string, value: any, curValues: Record<string, any>) {
    this.valuesChange.emit({
      type,
      values: {
        ...curValues,
        [key]: value,
      },
    });
  }

  getOptions(fileType: string, item: ConfigSchemaItem): any[] {
    if (item.type !== "select") return [];
    const k = item.optionsRef?.key;
    if (!k) return [];
    return this.vmOptionsByType?.[fileType]?.[k] ?? [];
  }
}
