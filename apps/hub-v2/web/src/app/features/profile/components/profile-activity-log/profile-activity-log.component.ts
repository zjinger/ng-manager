import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { PanelCardComponent } from '../../../../shared/ui/panel-card/panel-card.component';

export interface ProfileActivityItem {
  id: string;
  dotColor: string;
  html: string;
  meta: string;
}

@Component({
  selector: 'app-profile-activity-log',
  standalone: true,
  imports: [FormsModule, NzSelectModule, PanelCardComponent],
  template: `
    <app-panel-card title="操作日志">
      <div panel-actions>
        <nz-select class="toolbar-select profile-activity-filter" nzSize="small" [ngModel]="filter()" (ngModelChange)="filter.set($event)">
          <nz-option nzLabel="所有类型" nzValue="all"></nz-option>
          <nz-option nzLabel="Issue" nzValue="issue"></nz-option>
          <nz-option nzLabel="研发项" nzValue="rd"></nz-option>
          <nz-option nzLabel="配置" nzValue="config"></nz-option>
          <nz-option nzLabel="用户" nzValue="user"></nz-option>
        </nz-select>
      </div>

      <div class="activity-list">
        @for (item of items(); track item.id) {
          <div class="activity-item">
            <div class="activity-dot" [style.background]="item.dotColor"></div>
            <div class="activity-content">
              <div class="activity-text" [innerHTML]="item.html"></div>
              <div class="activity-meta">{{ item.meta }}</div>
            </div>
          </div>
        }
      </div>
    </app-panel-card>
  `,
  styles: [
    `
      .activity-list {
        display: grid;
      }

      .activity-item {
        display: flex;
        align-items: flex-start;
        gap: 14px;
        padding: 18px 20px;
        border-top: 1px solid var(--border-color-soft);
        transition: background-color 0.2s ease;
      }

      .activity-item:first-child {
        border-top: none;
      }

      .activity-item:hover {
        background: color-mix(in srgb, var(--bg-subtle) 72%, transparent);
      }

      .activity-dot {
        width: 10px;
        height: 10px;
        margin-top: 6px;
        border-radius: 999px;
        flex-shrink: 0;
        box-shadow: 0 0 0 6px color-mix(in srgb, var(--bg-subtle) 78%, transparent);
      }

      .activity-content {
        flex: 1;
        min-width: 0;
      }

      .activity-text {
        color: var(--text-primary);
        font-size: 14px;
        line-height: 1.7;
      }

      .activity-text :global(strong),
      .activity-text strong {
        font-weight: 700;
      }

      .activity-text :global(a),
      .activity-text a {
        color: var(--color-primary);
        text-decoration: none;
      }

      .activity-meta {
        margin-top: 6px;
        color: var(--text-muted);
        font-size: 12px;
        letter-spacing: 0.01em;
      }

      .profile-activity-filter {
        width: 132px;
      }

      :host-context(html[data-theme='dark']) .activity-item:hover {
        background: rgba(148, 163, 184, 0.08);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileActivityLogComponent {
  readonly items = input.required<ProfileActivityItem[]>();
  readonly filter = signal('all');
}
