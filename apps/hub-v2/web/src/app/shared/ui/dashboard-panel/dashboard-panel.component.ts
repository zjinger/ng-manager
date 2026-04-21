import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

@Component({
  selector: 'app-dashboard-panel',
  standalone: true,
  imports: [NzIconModule, RouterLink, NzTooltipModule],
  template: `
    <section class="panel">
      <header class="panel__header">
        <div class="panel__heading">
          @if (icon()) {
            <span class="panel__icon" nz-icon [nzType]="icon()!"></span>
          }
          <h3 class="panel__title">{{ title() }}</h3>
        </div>
        <div class="panel__header-right">
          <span class="panel__count">{{ count() }}</span>
          @if (actionIcon()&& actionLink().length > 0) {
             <a class="panel__action" [routerLink]="actionLink()" nz-tooltip [nzTooltipTitle]="actionText() || ''">
              <nz-icon class="panel__action-icon" [nzType]="actionIcon()!"></nz-icon>
             </a>
          }
        </div>
      </header>

      <div class="panel__body">
        @if (empty()) {
          <div class="panel__empty">{{ emptyText() }}</div>
        } @else {
          <ng-content></ng-content>
        }
      </div>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }
      .panel {
        background: var(--bg-container);
        border: 1px solid var(--border-color);
        border-radius: 16px;
        overflow: hidden;
        box-shadow: var(--shadow-sm);
        position: relative;
        height: 100%;
        display: flex;
        flex-direction: column;
      }
      .panel::after {
        content: '';
        position: absolute;
        inset: 0;
        pointer-events: none;
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent 26%);
      }
      .panel__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 18px;
        border-bottom: 1px solid var(--border-color-soft);
        flex-shrink: 0;
      }
      .panel__header-right {
        display: inline-flex;
        align-items: center;
        gap: 10px;
      }
      .panel__heading {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }
      .panel__icon {
        width: 20px;
        height: 20px;
        border-radius: 6px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: var(--primary-500);
        background: color-mix(in srgb, var(--primary-500) 12%, transparent);
        font-size: 12px;
      }
      .panel__body {
        flex: 1;
        min-height: 0;
        overflow: auto;
      }
      .panel__title {
        margin: 0;
        color: var(--text-heading);
        font-size: 15px;
        font-weight: 600;
      }
      .panel__count {
        padding: 1px 8px;
        border-radius: 10px;
        background: var(--bg-subtle);
        color: var(--text-muted);
        font-size: 12px;
        font-weight: 500;
      }
      .panel__action {
        color: var(--primary-600);
        font-size: 12px;
        font-weight: 600;
      }
      .panel__empty {
        height: 100%;
        padding: 32px 18px;
        text-align: center;
        color: var(--text-disabled);
        display: grid;
        place-items: center;
      }
      :host-context(html[data-theme='dark']) .panel {
        border-color: rgba(148, 163, 184, 0.14);
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.03), transparent 26%),
          var(--bg-container);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPanelComponent {
  readonly title = input.required<string>();
  readonly count = input<number>(0);
  readonly icon = input<string | null>(null);
  readonly empty = input(false);
  readonly emptyText = input('暂无数据');
  readonly actionIcon = input<string | null>(null);
  readonly actionText = input<string | null>(null);
  readonly actionLink = input<string[]>([]);
}
