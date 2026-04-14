import { CommonModule } from '@angular/common';
import { Component, Input, signal } from '@angular/core';

import { LogEntry, NginxLogViewerComponent } from '../../nginx-log-viewer/nginx-log-viewer.component';

@Component({
  selector: 'app-nginx-secondary-logs-tab',
  standalone: true,
  imports: [CommonModule, NginxLogViewerComponent],
  template: `
    <div class="panel-header-row compact">
      <div class="log-tabs">
        <button class="log-tab" [class.active]="activeLogTab() === 'error'" (click)="setLogTab('error')">
          error.log
        </button>
        <button class="log-tab" [class.active]="activeLogTab() === 'access'" (click)="setLogTab('access')">
          access.log
        </button>
      </div>
    </div>
    <app-nginx-log-viewer
      [title]="activeLogTab() === 'error' ? 'error.log' : 'access.log'"
      [showRealtime]="true"
      [logs]="activeLogTab() === 'error' ? logs : []"
      [maxHeight]="180"
    ></app-nginx-log-viewer>
  `,
  styles: [`
    :host {
      display: block;
    }

    .panel-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;

      &.compact {
        margin-bottom: 10px;
      }
    }

    .log-tabs {
      display: flex;
      gap: 0;
    }

    .log-tab {
      background: transparent;
      color: var(--text-3);
      font-size: var(--nginx-font-size-sm, 12px);
      font-weight: 500;
      padding: 6px 12px;
      cursor: pointer;
      transition: all 120ms ease;
      border: none;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;

      &:hover {
        color: var(--text-2);
      }

      &.active {
        color: var(--blue);
        border-bottom-color: var(--blue);
        font-weight: 600;
      }
    }
  `],
})
export class NginxSecondaryLogsTabComponent {
  @Input() logs: LogEntry[] = [];

  activeLogTab = signal<'error' | 'access'>('error');

  setLogTab(tab: 'error' | 'access') {
    this.activeLogTab.set(tab);
  }
}
