import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { NzIconModule } from 'ng-zorro-antd/icon';
import type { ContentTab } from '../../models/content.model';

@Component({
  selector: 'app-content-tabs',
  standalone: true,
  imports: [
    NzIconModule
  ],
  template: `
    <div class="content-tabs">
      @for (tab of tabs; track tab.value) {
        <button
          type="button"
          class="content-tabs__item"
          [class.is-active]="value() === tab.value"
          (click)="valueChange.emit(tab.value)"
        >
          <nz-icon [nzType]="tab.icon" nzTheme="outline"/>
          {{ tab.label }}
        </button>
      }
    </div>
  `,
  styles: [
    `
      .content-tabs {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 6px;
        border-radius: 14px;
        background: var(--bg-subtle);
      }
      .content-tabs__item {
        height: 36px;
        padding: 0 16px;
        border: 0;
        border-radius: 10px;
        background: transparent;
        color: var(--text-muted);
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
      }
      .content-tabs__item.is-active {
        background: var(--color-primary);
        color: #fff;
        box-shadow: var(--shadow-sm);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContentTabsComponent {
  readonly value = input.required<ContentTab>();
  readonly valueChange = output<ContentTab>();

  protected readonly tabs: Array<{ value: ContentTab; label: string; icon: string }> = [
    { value: 'announcements', label: '公告管理', icon: 'notification' },
    { value: 'documents', label: '文档管理', icon: 'file-text' },
    { value: 'releases', label: '版本发布', icon: 'cloud-upload' },
  ];
}
