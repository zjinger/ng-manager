import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NzTagModule } from 'ng-zorro-antd/tag';

export interface ActiveFilterTag {
  kind: string;
  value: string;
  label: string;
  className?: string;
}

@Component({
  selector: 'app-active-filters-bar',
  standalone: true,
  imports: [NzTagModule],
  template: `
    @if (tags().length > 0) {
      <div class="active-filters">
        <span class="active-filters__label">{{ title() }}</span>
        @for (tag of tags(); track tag.kind + ':' + tag.value) {
          <nz-tag
            nzMode="closeable"
            [class]="tag.className ? 'filter-tag ' + tag.className : 'filter-tag'"
            (nzOnClose)="remove.emit({ kind: tag.kind, value: tag.value })"
          >
            {{ tag.label }}
          </nz-tag>
        }
        <button type="button" class="active-filters__clear" (click)="clear.emit()">{{ clearText() }}</button>
      </div>
    }
  `,
  styles: [
    `
      .active-filters {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 10px 0 14px;
        flex-wrap: wrap;
      }
      .active-filters__label {
        color: var(--text-muted);
        font-size: 14px;
      }
      .active-filters__clear {
        border: 0;
        background: transparent;
        color: var(--primary-500);
        font-size: 13px;
        font-weight: 600;
        padding: 6px 8px;
        cursor: pointer;
      }
      :host ::ng-deep .active-filters .ant-tag.filter-tag {
        display: inline-flex;
        align-items: center;
        height: 30px;
        line-height: 30px;
        margin-inline-end: 0;
        border-radius: 999px;
        padding-inline: 12px;
        font-size: 13px;
        font-weight: 500;
        border: 1px solid var(--border-color);
        background: var(--bg-subtle);
        color: var(--text-primary);
      }
      :host ::ng-deep .active-filters .ant-tag.filter-tag .ant-tag-close-icon {
        margin-inline-start: 8px;
        font-size: 12px;
        color: var(--text-muted);
      }
      :host ::ng-deep .active-filters .ant-tag.filter-tag--status,
      :host ::ng-deep .active-filters .ant-tag.filter-tag--kind {
        background: rgba(37, 99, 235, 0.1);
        border-color: rgba(37, 99, 235, 0.35);
        color: rgb(30, 64, 175);
      }
      :host ::ng-deep .active-filters .ant-tag.filter-tag--priority {
        background: rgba(245, 158, 11, 0.14);
        border-color: rgba(245, 158, 11, 0.35);
        color: rgb(146, 64, 14);
      }
      :host ::ng-deep .active-filters .ant-tag.filter-tag--people,
      :host ::ng-deep .active-filters .ant-tag.filter-tag--project {
        background: rgba(16, 185, 129, 0.12);
        border-color: rgba(16, 185, 129, 0.35);
        color: rgb(6, 95, 70);
      }
      :host ::ng-deep .active-filters .ant-tag.filter-tag--scope {
        background: rgba(99, 102, 241, 0.12);
        border-color: rgba(99, 102, 241, 0.35);
        color: rgb(67, 56, 202);
      }
      :host ::ng-deep .active-filters .ant-tag.filter-tag--keyword {
        background: rgba(236, 72, 153, 0.12);
        border-color: rgba(236, 72, 153, 0.35);
        color: rgb(157, 23, 77);
      }
      :host ::ng-deep .active-filters .ant-tag.filter-tag--sort {
        background: rgba(100, 116, 139, 0.14);
        border-color: rgba(100, 116, 139, 0.35);
        color: rgb(51, 65, 85);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActiveFiltersBarComponent {
  readonly tags = input<ActiveFilterTag[]>([]);
  readonly title = input('当前筛选');
  readonly clearText = input('清空全部');
  readonly remove = output<{ kind: string; value: string }>();
  readonly clear = output<void>();
}

