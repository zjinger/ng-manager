import { CommonModule } from '@angular/common';
import { Component, computed, EventEmitter, input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { ConfigNavFileVM, ConfigNavNodeVM } from '../models/config-ui.model';

@Component({
  selector: 'app-config-nav-component',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzInputModule,
    NzIconModule,
    NzTooltipModule,
  ],
  template: `
    <aside class="config-nav">
      <div class="nav-search">
        <nz-input-wrapper>
          <nz-icon nzInputPrefix nzType="search" />
          <input
            nz-input
            placeholder="搜索配置源或文件"
            [ngModel]="keyword()"
            (ngModelChange)="keyword.set($event)"
          />
        </nz-input-wrapper>
      </div>

      <div class="provider-list">
        @for (node of filtered(); track node.id) {
          @let multi = isMultiFile(node);
          <div class="provider-group" [class.expanded]="isExpanded(node)" [class.active]="isNodeActive(node)">
            <button
              type="button"
              class="provider-item"
              [class.active]="isNodeActive(node)"
              (click)="selectProvider(node)"
            >
              <span class="provider-icon" [ngClass]="providerClass(node)">
                <nz-icon [nzType]="node.icon || 'setting'" nzTheme="outline" />
              </span>
              <span class="provider-info">
                <span class="provider-title-row">
                  <span class="provider-name">{{ node.label }}</span>
                </span>
                <span class="provider-meta" [nz-tooltip]="providerMeta(node)">
                  {{ providerMeta(node) }}
                </span>
              </span>
              @if (multi) {
                <nz-icon class="expand-icon" nzType="right" />
              }
            </button>

            @if (multi && isExpanded(node)) {
              <div class="file-list">
                @for (file of node.files || []; track file.filePath) {
                  <button
                    type="button"
                    class="file-item"
                    [class.active]="node.id === activeDomainId() && file.filePath === activeFilePath()"
                    [nz-tooltip]="file.filePath"
                    (click)="selectFile(node, file, $event)"
                  >
                    <nz-icon nzType="file-text" />
                    <span>{{ formatFileLabel(file) }}</span>
                  </button>
                }
              </div>
            }
          </div>
        } @empty {
          <div class="empty-nav">没有匹配的配置源</div>
        }
      </div>
    </aside>
  `,
  styles: [`
    .config-nav {
      width: 100%;
      min-height: 100%;
      background: var(--app-component-bg);
    }

    .nav-search {
      width: 100%;
      padding: 10px 12px;
      display: flex;
      gap: 10px;
      align-items: center;
      justify-content: space-between;
      flex: 0 0 auto;
    }

    .nav-search nz-input-wrapper {
      width: 100%;
      border-radius: 18px;
    }

    .provider-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 10px;
    }

    .provider-group {
      border-radius: 6px;
    }

    .provider-item,
    .file-item {
      width: 100%;
      border: 0;
      background: transparent;
      cursor: pointer;
      text-align: left;
      color: inherit;
    }

    .provider-item {
      position: relative;
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 62px;
      padding: 10px;
      border-radius: 6px;
    }

    .provider-item:hover,
    .provider-item.active {
      background: var(--app-primary-2);
    }

    .provider-icon {
      flex: 0 0 34px;
      width: 34px;
      height: 34px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      background: #f0f5ff;
      color: #1677ff;
      font-size: 18px;
    }

    .provider-icon.ts,
    .provider-icon.package-json,
    .provider-icon.vite-config,
    .provider-icon.env {
      background: #f6ffed;
      color: #389e0d;
    }

    .provider-info {
      flex: 1 1 auto;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .provider-title-row {
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .provider-name {
      min-width: 0;
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .provider-meta {
      color: var(--app-text-secondary);
      font-size: 12px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .expand-icon {
      color: var(--app-text-secondary);
      transition: transform .18s ease;
    }

    .expanded .expand-icon {
      transform: rotate(90deg);
    }

    .file-list {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 2px 8px 8px 54px;
    }

    .file-item {
      display: flex;
      align-items: center;
      gap: 7px;
      min-height: 30px;
      padding: 5px 8px;
      border-radius: 4px;
      color: var(--app-text-secondary);
      font-size: 12px;
    }

    .file-item span {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .file-item:hover,
    .file-item.active {
      color: var(--app-primary);
      background: var(--app-primary-2);
    }

    .empty-nav {
      padding: 20px 10px;
      color: var(--app-text-secondary);
      text-align: center;
    }
  `],
})
export class ConfigNavComponent {
  keyword = signal('');
  nodes = input<ConfigNavNodeVM[]>([]);
  activeDomainId = input<string>('');
  activeFilePath = input<string>('');
  @Output() domainSelect = new EventEmitter<string>();
  @Output() documentSelect = new EventEmitter<{ type: string; filePath?: string }>();

  private expanded = signal<Record<string, boolean>>({});

  selectProvider(node: ConfigNavNodeVM) {
    if (this.isMultiFile(node)) {
      this.expanded.update((state) => ({ ...state, [node.id]: !state[node.id] }));
      return;
    }
    const firstFile = node.files?.[0]?.filePath;
    this.domainSelect.emit(node.id);
    this.documentSelect.emit({ type: node.id, filePath: firstFile });
  }

  selectFile(node: ConfigNavNodeVM, file: ConfigNavFileVM, event: MouseEvent) {
    event.stopPropagation();
    this.domainSelect.emit(node.id);
    this.documentSelect.emit({ type: node.id, filePath: file.filePath });
  }

  isMultiFile(node: ConfigNavNodeVM): boolean {
    return (node.files?.length ?? 0) > 1;
  }

  isExpanded(node: ConfigNavNodeVM): boolean {
    return this.expanded()[node.id] || node.id === this.activeDomainId();
  }

  isNodeActive(node: ConfigNavNodeVM): boolean {
    return node.id === this.activeDomainId() && (!this.isMultiFile(node) || !this.activeFilePath());
  }

  providerMeta(node: ConfigNavNodeVM): string {
    const files = node.files ?? [];
    if (files.length === 1) {
      return this.formatFileLabel(files[0]);
    }
    if (files.length > 1) {
      return `${files.length} 个文件`;
    }
    return node.description || '未检测到文件';
  }

  providerClass(node: ConfigNavNodeVM): string {
    return node.id.replace(/[^a-z0-9_-]/gi, '-');
  }

  formatFileLabel(file: ConfigNavFileVM): string {
    if (file.filePath === 'vue-project:overview') {
      return '项目概览';
    }
    return file.title || file.filePath;
  }

  filtered = computed(() => {
    const kw = this.keyword().trim().toLowerCase();
    if (!kw) return this.nodes();

    return this.nodes().filter((item) =>
      (item.label ?? '').toLowerCase().includes(kw) ||
      (item.description ?? '').toLowerCase().includes(kw) ||
      (item.files ?? []).some((file) => file.filePath.toLowerCase().includes(kw) || file.title.toLowerCase().includes(kw))
    );
  });
}
