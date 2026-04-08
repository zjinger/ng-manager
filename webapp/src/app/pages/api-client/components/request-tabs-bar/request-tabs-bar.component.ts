import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  inject,
  Input,
  Output,
  ViewChild,
  computed,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzDropDownModule, NzContextMenuService, NzDropdownMenuComponent } from 'ng-zorro-antd/dropdown';
import { NzMenuModule } from 'ng-zorro-antd/menu';

import type { ApiClientTab } from '@models/api-client';

/**
 * 右键菜单操作类型
 */
export type TabContextMenuAction =
  | 'close'
  | 'closeOthers'
  | 'closeRight'
  | 'closeSaved'
  | 'closeAll'
  | 'rename'
  | 'duplicate'
  | 'copyUrl'
  | 'moveTo';

/**
 * 右键菜单事件
 */
export interface TabContextMenuEvent {
  tabId: string;
  action: TabContextMenuAction;
}

/**
 * 请求 Tabs 标签栏组件
 * 支持多请求并行编辑、右键菜单、快捷键
 */
@Component({
  selector: 'app-request-tabs-bar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DragDropModule,
    NzTabsModule,
    NzButtonModule,
    NzIconModule,
    NzTooltipModule,
    NzDropDownModule,
    NzMenuModule,
  ],
  templateUrl: './request-tabs-bar.component.html',
  styleUrls: ['./request-tabs-bar.component.less'],
  
})
export class RequestTabsBarComponent {
  private contextMenuService = inject(NzContextMenuService);

  @Input() tabs = signal<ApiClientTab[]>([]);
  @Input() activeTabId = signal<string | null>(null);
  @Input() canOpenMore = true;

  @Output() tabChange = new EventEmitter<string>();
  @Output() tabClose = new EventEmitter<string>();
  @Output() tabAdd = new EventEmitter<void>();
  @Output() tabRename = new EventEmitter<{ id: string; title: string }>();
  @Output() tabReorder = new EventEmitter<{ from: number; to: number }>();
  @Output() tabContextMenu = new EventEmitter<TabContextMenuEvent>();
  @Output() startRenameEdit = new EventEmitter<string>(); // 触发重命名编辑模式

  @ViewChild('editInput') editInput?: ElementRef<HTMLInputElement>;
  @ViewChild('contextMenu') contextMenu?: NzDropdownMenuComponent

  readonly editingTabId = signal<string | null>(null);
  readonly editingTitle = signal('');

  // 右键菜单状态
  readonly contextTab = signal<ApiClientTab | null>(null);
  readonly contextIndex = signal(-1);

  activeIndex = computed(() => {
    const id = this.activeTabId();
    const tabs = this.tabs();
    return id ? tabs.findIndex((t) => t.id === id) : -1;
  });

  /** 是否有右侧 Tab */
  hasRightTabs(): boolean {
    const idx = this.contextIndex();
    return idx >= 0 && idx < this.tabs().length - 1;
  }

  /** 是否有已保存的 Tab */
  hasSavedTabs(): boolean {
    return this.tabs().some(t => !t.isDirty && t.requestId);
  }

  /**
   * 快捷键支持
   * Ctrl+T: 新建 Tab
   * Ctrl+W: 关闭当前 Tab
   * F2: 重命名当前 Tab
   */
  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    // Ctrl+T: 新建 Tab
    if (event.ctrlKey && event.key === 't') {
      event.preventDefault();
      this.onAddClick();
      return;
    }

    // Ctrl+W: 关闭当前 Tab
    if (event.ctrlKey && event.key === 'w') {
      event.preventDefault();
      const activeId = this.activeTabId();
      if (activeId) {
        this.tabClose.emit(activeId);
      }
      return;
    }

    // F2: 重命名当前 Tab
    if (event.key === 'F2') {
      event.preventDefault();
      const activeId = this.activeTabId();
      if (activeId) {
        const tab = this.tabs().find(t => t.id === activeId);
        if (tab) {
          this.startEdit(tab);
        }
      }
      return;
    }
  }

  getMethodClass(method: string): string {
    return method.toLowerCase();
  }

  getDisplayTitle(tab: ApiClientTab): string {
    if (tab.title && tab.title !== 'New Request') {
      return this.truncate(tab.title, 20);
    }

    const request = tab.request;
    if (!request.url) return 'New Request';

    const path = this.extractPath(request.url);
    return this.truncate(path, 20);
  }

  getFullTitle(tab: ApiClientTab): string {
    if (tab.title && tab.title !== 'New Request') {
      return tab.title;
    }

    const request = tab.request;
    if (!request.url) return 'New Request';

    return `${request.method} ${request.url}`;
  }

  private extractPath(url: string): string {
    const cleaned = url
      .replace(/^\{\{[^}]+\}\}/, '')
      .replace(/^https?:\/\/[^/]+/, '');
    return cleaned.split('?')[0] || '/';
  }

  private truncate(str: string, maxLen: number): string {
    if (str.length <= maxLen) return str;
    return str.slice(0, maxLen - 2) + '…';
  }

  onTabClick(tabId: string): void {
    if (tabId !== this.activeTabId()) {
      this.tabChange.emit(tabId);
    }
  }

  onCloseClick(tabId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.tabClose.emit(tabId);
  }

  onAddClick(): void {
    this.tabAdd.emit();
  }

  /** 右键菜单 */
  onContextMenu(event: MouseEvent, tab: ApiClientTab, index: number): void {
    event.preventDefault();

    this.contextTab.set(tab);
    this.contextIndex.set(index);

    // 使用 NzContextMenuService 显示右键菜单
    this.contextMenuService.create(event, this.contextMenu!);
  }

  /** 右键菜单操作 */
  onMenuAction(action: TabContextMenuAction): void {
    const tab = this.contextTab();
    if (!tab) return;

    // 重命名特殊处理：启动编辑模式
    if (action === 'rename') {
      this.switchToTab(tab.id);
      this.startEdit(tab);
      this.clearContext();
      return;
    }

    this.tabContextMenu.emit({
      tabId: tab.id,
      action,
    });

    this.clearContext();
  }

  /** 切换到指定 Tab */
  private switchToTab(tabId: string): void {
    if (tabId !== this.activeTabId()) {
      this.tabChange.emit(tabId);
    }
  }

  /** 开始编辑 */
  startEdit(tab: ApiClientTab): void {
    this.editingTabId.set(tab.id);
    this.editingTitle.set(tab.title || tab.request.name || 'New Request');
    setTimeout(() => {
      this.editInput?.nativeElement?.focus();
      this.editInput?.nativeElement?.select();
    }, 0);
  }

  finishEdit(): void {
    const id = this.editingTabId();
    const title = this.editingTitle().trim();
    if (id && title) {
      this.tabRename.emit({ id, title });
    }
    this.cancelEdit();
  }

  cancelEdit(): void {
    this.editingTabId.set(null);
    this.editingTitle.set('');
  }

  onDrop(event: CdkDragDrop<ApiClientTab[]>): void {
    if (event.previousIndex !== event.currentIndex) {
      this.tabReorder.emit({
        from: event.previousIndex,
        to: event.currentIndex,
      });
    }
  }

  /** 清除右键菜单状态 */
  private clearContext(): void {
    this.contextTab.set(null);
    this.contextIndex.set(-1);
  }
}
