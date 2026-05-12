import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, signal } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { ConfigField, ConfigSchema } from '../models';
import { getByPath, setByPath } from '../utils';
import { ConfigItemComponent } from './config-item-component';

@Component({
  selector: 'app-config-section-component',
  standalone: true,
  imports: [CommonModule, NzIconModule, ConfigItemComponent],
  template: `
    @if (schema) {
      <div class="config-card-list">
        @for (sec of schema.groups || []; track sec.key) {
          <section class="config-card" [class.collapsed]="isCollapsed(sec.key)" [attr.id]="sec.key">
            <button type="button" class="config-card-header" (click)="toggle(sec.key)">
              <span class="config-card-title">
                <span class="title-main">{{ sec.title }}</span>
                <span class="config-card-count">{{ sec.fields.length }} 项</span>
                @if (sec.description) {
                  <span class="config-card-desc">{{ sec.description }}</span>
                }
              </span>
              <nz-icon class="config-card-toggle" nzType="down" />
            </button>
            @if (!isCollapsed(sec.key)) {
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
            }
          </section>
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

    .config-card {
      border: 0;
      border-radius: 10px;
      overflow: hidden;
      background: var(--app-component-bg);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    }

    .config-card-header {
      width: 100%;
      min-height: 52px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 12px 16px;
      border: 0;
      background: transparent;
      color: inherit;
      cursor: pointer;
      text-align: left;
    }

    .config-card-title {
      min-width: 0;
      display: flex;
      align-items: baseline;
      gap: 10px;
      flex-wrap: wrap;
    }

    .title-main {
      font-size: 16px;
      font-weight: 700;
    }

    .config-card-count,
    .config-card-desc {
      color: var(--app-text-secondary);
      font-size: 12px;
    }

    .config-card-desc {
      max-width: 520px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .config-card-toggle {
      flex: 0 0 auto;
      color: var(--app-text-secondary);
      transition: transform .18s ease;
    }

    .collapsed .config-card-toggle {
      transform: rotate(-90deg);
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
export class ConfigSectionComponent implements OnChanges {
  @Input() schema?: ConfigSchema;
  @Input() vm: unknown = null;
  @Input() viewModel: unknown = null;
  @Input() options: Record<string, unknown> = {};
  @Output() vmChange = new EventEmitter<unknown>();

  private collapsed = signal<Record<string, boolean>>({});

  ngOnChanges(changes: SimpleChanges): void {
    if ('schema' in changes) {
      this.resetCollapsedState();
    }
  }

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

  toggle(key: string) {
    this.collapsed.update((state) => ({ ...state, [key]: !state[key] }));
  }

  isCollapsed(key: string): boolean {
    return !!this.collapsed()[key];
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

  private resetCollapsedState(): void {
    const groups = this.schema?.groups ?? [];
    const next: Record<string, boolean> = {};
    groups.forEach((group, index) => {
      next[group.key] = index > 0;
    });
    this.collapsed.set(next);
  }
}
