import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzIconModule } from 'ng-zorro-antd/icon';

import type { IssueEntity } from '../../models/issue.model';
import { IssueDetailDrawerPageComponent } from '../../pages/issue-detail-page/issue-detail-drawer-page.component'; 

@Component({
  selector: 'app-issue-detail-drawer',
  standalone: true,
  imports: [NzDrawerModule, NzIconModule, IssueDetailDrawerPageComponent],
  template: `
    <nz-drawer
      [nzVisible]="open()"
      [nzClosable]="false"
      [nzMaskClosable]="true"
      [nzWidth]="900"
      [nzWrapClassName]="'issue-detail-drawer'"
      [nzBodyStyle]="drawerBodyStyle"
      (nzOnClose)="close.emit()"
      [nzMask]="false"
      [nzTitle]="drawerTitleTpl"
    >
      <ng-template #drawerTitleTpl>
        <div class="detail-drawer__title">
          <div class="detail-drawer__title-main">
            @if (subtitleText(); as subtitle) {
              <span class="detail-drawer__subtitle">{{ subtitle }}</span>
            }
            <strong>{{ titleText() }}</strong>
          </div>
          <button type="button" class="detail-drawer__close" (click)="close.emit()">
            <span nz-icon nzType="close"></span>
          </button>
        </div>
      </ng-template>

      <ng-template nzDrawerContent>
        @if (issueId(); as id) {
          <!-- <app-issue-detail-page [issueId]="id" [embedded]="true" /> -->
          <app-issue-detail-drawer-page [issueId]="id" (changed)="changed.emit($event)" />
        }
      </ng-template>
    </nz-drawer>
  `,
  styles: [
    `
      .detail-drawer__title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .detail-drawer__title-main {
        display: flex;
        flex-direction: row;
        gap: 4px;
        align-items: center;
      }
      .detail-drawer__title-main strong {
        color: var(--text-primary);
        font-size: 18px;
        line-height: 1.2;
      }
      .detail-drawer__subtitle {
        color: var(--text-muted);
        font-size: 12px;
        line-height: 1.4;
        background: var(--gray-100);
        padding: 3px 8px;
        border-radius: 4px;
        white-space: nowrap;
      }
      .detail-drawer__close {
        width: 36px;
        height: 36px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 0;
        background: transparent;
        color: var(--text-muted);
        cursor: pointer;
        border-radius: 999px;
        transition: var(--transition-base);
      }
      .detail-drawer__close:hover {
        background: var(--bg-subtle);
        color: var(--text-primary);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssueDetailDrawerComponent {
  readonly open = input(false);
  readonly issueId = input<string | null>(null);
  readonly issue = input<IssueEntity | null>(null);
  readonly close = output<void>();
  readonly changed = output<IssueEntity>();

  readonly drawerBodyStyle = { padding: '18px 20px 24px', overflow: 'auto' };
  readonly titleText = computed(() => this.issue()?.title || '测试单详情');
  readonly subtitleText = computed(() => this.issue()?.issueNo || this.issueId() || '');
}
