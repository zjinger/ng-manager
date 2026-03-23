import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzIconModule } from 'ng-zorro-antd/icon';

import type { IssueEntity } from '../../models/issue.model';
import { IssueDetailPageComponent } from '../../pages/issue-detail-page/issue-detail-page.component';

@Component({
  selector: 'app-issue-detail-drawer',
  standalone: true,
  imports: [NzDrawerModule, NzIconModule, IssueDetailPageComponent],
  template: `
    <nz-drawer
      [nzVisible]="open()"
      [nzClosable]="false"
      [nzMaskClosable]="true"
      [nzWidth]="1140"
      [nzWrapClassName]="'issue-detail-drawer'"
      [nzBodyStyle]="drawerBodyStyle"
      (nzOnClose)="close.emit()"
      [nzMask]="false"
      [nzTitle]="drawerTitleTpl"
    >
      <ng-template #drawerTitleTpl>
        <div class="detail-drawer__title">
          <div class="detail-drawer__title-main">
            <span class="detail-drawer__eyebrow">Issues</span>
            <strong>{{ titleText() }}</strong>
            @if (subtitleText(); as subtitle) {
              <span class="detail-drawer__subtitle">{{ subtitle }}</span>
            }
          </div>
          <button type="button" class="detail-drawer__close" (click)="close.emit()">
            <span nz-icon nzType="close"></span>
          </button>
        </div>
      </ng-template>

      <ng-template nzDrawerContent>
        @if (issueId(); as id) {
          <app-issue-detail-page [issueId]="id" [embedded]="true" />
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
        flex-direction: column;
        gap: 4px;
      }
      .detail-drawer__title-main strong {
        color: var(--text-primary);
        font-size: 18px;
        line-height: 1.2;
      }
      .detail-drawer__eyebrow {
        font-size: 11px;
        line-height: 1;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--primary-700);
        font-weight: 700;
      }
      .detail-drawer__subtitle {
        color: var(--text-muted);
        font-size: 12px;
        line-height: 1.4;
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

  readonly drawerBodyStyle = { padding: '18px 20px 24px', overflow: 'auto' };
  readonly titleText = computed(() => this.issue()?.title || 'Issue 详情');
  readonly subtitleText = computed(() => this.issue()?.issueNo || this.issueId() || '');
}
