import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-profile-tabs',
  standalone: true,
  template: `
    <nav class="profile-tabs">
      @for (tab of tabs(); track tab.id) {
        <button type="button" class="profile-tab" [class.active]="activeId() === tab.id" (click)="tabChange.emit(tab.id)">
          <span class="profile-tab__dot"></span>
          <span>{{ tab.label }}</span>
        </button>
      }
    </nav>
  `,
  styles: [
    `
      .profile-tabs {
        display: flex;
        align-items: center;
        gap: 4px;
        margin-bottom: 20px;
        border-bottom: 1px solid var(--border-color);
      }

      .profile-tab {
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

      .profile-tab:hover {
        color: var(--text-secondary);
      }

      .profile-tab.active {
        color: var(--color-primary);
        border-bottom-color: var(--color-primary);
      }

      .profile-tab__dot {
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: currentColor;
      }

      :host-context(html[data-theme='dark']) .profile-tab:hover {
        color: var(--text-primary);
      }

      @media (max-width: 768px) {
        .profile-tabs {
          overflow-x: auto;
          white-space: nowrap;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileTabsComponent {
  readonly tabs = input.required<{ id: string; label: string }[]>();
  readonly activeId = input.required<string>();
  readonly tabChange = output<string>();
}
