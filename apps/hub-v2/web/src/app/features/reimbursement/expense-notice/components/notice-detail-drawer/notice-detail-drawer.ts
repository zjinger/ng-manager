import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzIconModule } from 'ng-zorro-antd/icon';

import type { NoticeDetail, SelectOption } from '../../models/notice.model';

type DetailField = {
  label: string;
  value: string;
};

@Component({
  selector: 'app-notice-detail-drawer',
  standalone: true,
  imports: [ NzDrawerModule, NzButtonModule, NzIconModule],

  template: `
    <nz-drawer
      [nzVisible]="open()"
      [nzClosable]="false"
      [nzMaskClosable]="true"
      [nzMask]="false"
      [nzWidth]="720"
      [nzBodyStyle]="DRAWER_BODY_STYLE"
      [nzTitle]="drawerTitleTpl"
      (nzOnClose)="close.emit()"
    >
      <ng-template #drawerTitleTpl>
        <div class="notice-detail__title">
          <div class="notice-detail__title-main">
            <span class="notice-detail__subtitle">公告详情</span>
            <strong>{{ detail()?.title || '公告详情' }}</strong>
          </div>

          <button type="button" class="notice-detail__close" (click)="close.emit()">
            <span nz-icon nzType="close"></span>
          </button>
        </div>
      </ng-template>

      <ng-template nzDrawerContent>
        @if (detail(); as item) {
        <div class="notice-detail">
          <div class="notice-detail__actions">
            @for (action of actions; track action.key) {
            <button
              nz-button
              nzSize="small"
              [nzType]="action.type"
              [nzDanger]="action.danger"
              (click)="action.handler(item)"
            >
              {{ action.label }}
            </button>
            }
          </div>

          <div class="notice-detail__grid">
            @for (field of detailFields(); track field.label) {
            <div class="notice-detail__field">
              <span>{{ field.label }}</span>
              <strong>{{ field.value }}</strong>
            </div>
            }
          </div>

          <section class="notice-detail__section">
            <h4>公告内容</h4>

            <pre class="notice-detail__content"
              >{{ item.content || '暂无内容' }}
              </pre
            >
          </section>
        </div>
        }
      </ng-template>
    </nz-drawer>
  `,

  styles: [
    `
      :host {
        display: contents;
      }

      .notice-detail {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .notice-detail__title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .notice-detail__title-main {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }

      .notice-detail__title-main strong {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--text-primary);
        font-size: 18px;
      }

      .notice-detail__subtitle {
        padding: 3px 8px;
        border-radius: 4px;
        background: var(--gray-100);
        color: var(--text-muted);
        font-size: 12px;
      }

      .notice-detail__close {
        width: 36px;
        height: 36px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 0;
        border-radius: 999px;
        background: transparent;
        color: var(--text-muted);
        cursor: pointer;
      }

      .notice-detail__close:hover {
        background: var(--bg-subtle);
        color: var(--text-primary);
      }

      .notice-detail__actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
      }

      .notice-detail__grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }

      .notice-detail__field {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 12px;
        border: 1px solid var(--border-color-soft);
        border-radius: 12px;
        background: var(--bg-subtle);
      }

      .notice-detail__field span {
        color: var(--text-muted);
        font-size: 12px;
      }

      .notice-detail__field strong {
        color: var(--text-primary);
        font-size: 14px;
        font-weight: 600;
      }

      .notice-detail__section {
        padding: 16px;
        border: 1px solid var(--border-color-soft);
        border-radius: 12px;
        background: var(--surface-primary);
      }

      .notice-detail__section h4 {
        margin: 0 0 12px;
        color: var(--text-heading);
        font-size: 14px;
      }

      .notice-detail__content {
        margin: 0;
        line-height: 1.7;
        white-space: pre-wrap;
        word-break: break-word;
        color: var(--text-primary);
        font-family: inherit;
      }

      @media (max-width: 900px) {
        .notice-detail__grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoticeDetailDrawerComponent {
  readonly open = input(false);
  readonly detail = input<NoticeDetail | null>(null);

  readonly noticeTypeOptions = input<SelectOption[]>([]);
  readonly visibleScopeOptions = input<SelectOption[]>([]);
  readonly statusOptions = input<SelectOption[]>([]);

  readonly close = output<void>();
  readonly edit = output<NoticeDetail>();
  readonly publish = output<NoticeDetail>();
  readonly offline = output<NoticeDetail>();
  readonly delete = output<NoticeDetail>();

  protected readonly DRAWER_BODY_STYLE = {
    padding: '18px 20px 24px',
    overflow: 'auto',
  };

  protected readonly actions = [
    {
      key: 'edit',
      label: '编辑',
      type: 'default' as const,
      danger: false,
      handler: (item: NoticeDetail) => this.edit.emit(item),
    },
    {
      key: 'publish',
      label: '发布',
      type: 'primary' as const,
      danger: false,
      handler: (item: NoticeDetail) => this.publish.emit(item),
    },
    {
      key: 'offline',
      label: '下线',
      type: 'default' as const,
      danger: true,
      handler: (item: NoticeDetail) => this.offline.emit(item),
    },
    {
      key: 'delete',
      label: '删除',
      type: 'default' as const,
      danger: true,
      handler: (item: NoticeDetail) => this.delete.emit(item),
    },
  ];

  protected readonly detailFields = computed<DetailField[]>(() => {
    const item = this.detail();

    if (!item) {
      return [];
    }

    return [
      {
        label: '公告类型',
        value: this.getLabel(this.noticeTypeOptions(), item.type),
      },
      {
        label: '可见范围',
        value: this.getLabel(this.visibleScopeOptions(), item.visibleScope),
      },
      {
        label: '发布状态',
        value: this.getLabel(this.statusOptions(), item.publishStatus),
      },
      {
        label: '是否置顶',
        value: item.pinned ? '是' : '否',
      },
      {
        label: '是否通知相关人员',
        value: item.notifyRelatedUsers ? '是' : '否',
      },
      {
        label: '生效日期',
        value: item.effectiveDate || '-',
      },
      {
        label: '失效日期',
        value: item.expireDate || '-',
      },
    ];
  });

  private getLabel(options: SelectOption[], value: string): string {
    return options.find((item) => item.value === value)?.label || value || '-';
  }
}
