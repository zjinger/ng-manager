import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import type { ContentTab } from '../../models/content.model';

@Component({
  selector: 'app-content-tabs',
  standalone: true,
  template: `
    <div class="content-tabs">
      @for (tab of tabs; track tab.value) {
        <button
          type="button"
          class="content-tabs__item"
          [class.is-active]="value() === tab.value"
          (click)="valueChange.emit(tab.value)"
        >
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
        background: var(--bg-container);
        color: var(--text-primary);
        box-shadow: var(--shadow-sm);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContentTabsComponent {
  readonly value = input.required<ContentTab>();
  readonly valueChange = output<ContentTab>();

  protected readonly tabs: Array<{ value: ContentTab; label: string }> = [
    { value: 'announcements', label: '公告' },
    { value: 'documents', label: '文档' },
    { value: 'releases', label: '发布' },
  ];
}
