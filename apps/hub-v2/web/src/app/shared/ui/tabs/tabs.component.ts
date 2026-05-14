import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';

@Component({
  selector: 'app-tabs',
  standalone: true,
  imports: [CommonModule, NzIconModule],
  template: `
    <nav class="tabs">
      @for (tab of tabs(); track tab.id) {
        <button
          type="button"
          class="tabs__item"
          [class.active]="activeId() === tab.id"
          (click)="tabChange.emit(tab.id)"
        >
          @if (tab.icon) {
            <nz-icon [nzType]="tab.icon" />
          }
          <span>{{ tab.label }}</span>
        </button>
      }
    </nav>
  `,
  styles: `
    .tabs {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-bottom: 20px;
      border-bottom: 1px solid var(--border-color);
    }

    .tabs__item {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 0 10px 14px;
      border: none;
      border-bottom: 2px solid transparent;
      background: transparent;
      color: var(--text-muted);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition:
        color 0.2s ease,
        border-color 0.2s ease;
    }

    .tabs__item:hover {
      color: var(--text-secondary);
    }

    .tabs__item.active {
      color: var(--color-primary);
      border-bottom-color: var(--color-primary);
    }

    :host-context(html[data-theme='dark']) .tabs__item:hover {
      color: var(--text-primary);
    }

    @media (max-width: 768px) {
      .tabs {
        overflow-x: auto;
        white-space: nowrap;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabsComponent {
  readonly tabs = input.required<{ id: string; label: string; icon?: string }[]>();
  readonly activeId = input.required<string>();
  readonly tabChange = output<string>();
}
