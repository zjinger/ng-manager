import { CommonModule } from '@angular/common';
import { Component, Input, signal } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';

@Component({
  selector: 'app-collapsible-card',
  standalone: true,
  imports: [CommonModule, NzIconModule],
  host: {
    '[class.collapsible-card]': 'true',
    '[class.collapsed]': 'isCollapsed()',
  },
  template: `
    <div class="collapsible-card-header" (click)="toggle()">
      <span class="collapsible-card-title">
        <span class="title-main">{{ title }}</span>
        @if (badge) {
          <span class="collapsible-card-badge">{{ badge }}</span>
        }
        @if (description) {
          <span class="collapsible-card-desc">{{ description }}</span>
        }
      </span>
      <div class="collapsible-card-header-right">
        <ng-content select="[cardActions]"></ng-content>
        <nz-icon class="collapsible-card-toggle" nzType="down" />
      </div>
    </div>
    @if (!isCollapsed()) {
      <div class="collapsible-card-body">
        <ng-content></ng-content>
      </div>
    }
  `,
  styles: `
    :host.collapsible-card {
      display: block;
      border: 0;
      border-radius: 10px;
      overflow: hidden;
      background: var(--app-component-bg, #fff);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    }

    .collapsible-card-header {
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

    .collapsible-card-header-right {
      display: flex;
      flex: 1;
      align-items: center;
      justify-content: right;
      gap: 8px;
      flex-shrink: 0;
    }

    .collapsible-card-title {
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

    .collapsible-card-badge,
    .collapsible-card-desc {
      color: var(--app-text-secondary, #8c8c8c);
      font-size: 12px;
    }

    .collapsible-card-desc {
      max-width: 520px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .collapsible-card-toggle {
      flex: 0 0 auto;
      color: var(--app-text-secondary, #8c8c8c);
      transition: transform .18s ease;
    }

    :host.collapsed .collapsible-card-toggle {
      transform: rotate(-90deg);
    }

    .collapsible-card-body {
      display: flex;
      flex-direction: column;
      padding: 0 16px 16px;
    }
  `,
})
export class CollapsibleCardComponent {
  @Input() title = '';
  @Input() description?: string;
  @Input() badge?: string;
  @Input() defaultCollapsed = false;

  private readonly collapsedSignal = signal<boolean>(false);

  get isCollapsed() {
    return this.collapsedSignal.asReadonly();
  }

  ngOnInit(): void {
    this.collapsedSignal.set(this.defaultCollapsed);
  }

  toggle(): void {
    this.collapsedSignal.update((v) => !v);
  }
}