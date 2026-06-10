import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CollapsibleCardComponent } from '@app/shared/components/collapsible-card/collapsible-card.component';
import { ConfigField, ConfigSchema } from '../models';
import { getByPath, setByPath } from '../utils';
import { ConfigItemComponent } from './config-item-component';

@Component({
  selector: 'app-config-section-component',
  standalone: true,
  imports: [CommonModule, CollapsibleCardComponent, ConfigItemComponent],
  template: `
    @if (schema) {
      <div class="config-card-list">
        @for (sec of schema.groups || []; track sec.key; let idx = $index) {
          <app-collapsible-card
            [title]="sec.title"
            [badge]="sec.fields.length + ' 项'"
            [description]="sec.description"
            [defaultCollapsed]="idx > 0"
            [attr.id]="sec.key"
          >
            <div class="config-card-body">
              @for (item of sec.fields; track item.key) {
                <app-config-item-component
                  [item]="item"
                  [options]="item.options || []"
                  [value]="get(item)"
                  [viewModel]="viewModel"
                  (valueChange)="onValueChange($event, item)">
                </app-config-item-component>
              }
            </div>
          </app-collapsible-card>
        }
      </div>
    } @else {
      <div class="empty">
        该配置暂不支持表单模式。
      </div>
    }
  `,
  styles: [`
    .config-card-list {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .config-card-body {
      display: flex;
      flex-direction: column;
    }

    .empty {
      padding: 24px;
      color: var(--app-text-secondary);
      border: 1px dashed var(--app-border-color);
      border-radius: 8px;
      background: var(--app-component-bg);
    }
  `],
})
export class ConfigSectionComponent {
  @Input() schema?: ConfigSchema;
  @Input() vm: unknown = null;
  @Input() viewModel: unknown = null;
  @Input() options: Record<string, unknown> = {};
  @Output() vmChange = new EventEmitter<unknown>();

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

  onValueChange(value: unknown, item: ConfigField) {
    this.update(item.path, value);
  }

  private update(path: string, value: unknown) {
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
    return metadata.fallbackPaths.filter((path): path is string => typeof path === 'string');
  }

  private getDefaultValue(item: ConfigField): unknown {
    const metadata = (item.metadata ?? {}) as { defaultValue?: unknown };
    return metadata.defaultValue;
  }
}