import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-nginx-stat-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stat-card">
      <div class="stat-label">{{ label }}</div>
      <div class="stat-value" [ngClass]="toneClass">{{ value }}</div>
      <div class="stat-sub">{{ sub }}</div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .stat-card {
      background: var(--bg-white);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 14px;
      box-shadow: var(--shadow-card);
      transition: all 140ms ease;

      &:hover {
        box-shadow: var(--shadow-hover);
        transform: translateY(-1px);
      }
    }

    .stat-label {
      font-size: var(--nginx-font-size-sm, 12px);
      color: var(--text-3);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }

    .stat-value {
      font-size: var(--nginx-font-size-kpi, 22px);
      line-height: 1.1;
      font-weight: 800;
      color: var(--text-1);
      font-family: var(--nginx-font-family-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace);
      margin-bottom: 4px;

      &.green {
        color: var(--green);
      }

      &.blue {
        color: var(--blue);
      }

      &.purple {
        color: var(--purple);
      }

      &.orange {
        color: var(--orange);
      }

      &.red {
        color: var(--red);
      }
    }

    .stat-sub {
      font-size: var(--nginx-font-size-sm, 12px);
      color: var(--text-3);
      font-family: var(--nginx-font-family-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace);
    }
  `,
})
export class NginxStatCardComponent {
  @Input() label = '';
  @Input() value: string | number = '-';
  @Input() sub = '';
  @Input() toneClass: 'green' | 'blue' | 'purple' | 'orange' | 'red' | '' = '';
}

