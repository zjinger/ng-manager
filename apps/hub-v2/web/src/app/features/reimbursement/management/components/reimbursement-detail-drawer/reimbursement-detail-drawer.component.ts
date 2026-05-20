import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzIconModule } from 'ng-zorro-antd/icon';

import type { ReimbursementClaimEntity } from '@app/features/reimbursement/models/reimbursement.model';
import { ReimbursementDetailDrawerPageComponent } from '../../pages/reimbursement-detail-page/reimbursement-detail-drawer-page.component';

@Component({
  selector: 'app-reimbursement-detail-drawer',
  standalone: true,
  imports: [NzDrawerModule, NzIconModule, ReimbursementDetailDrawerPageComponent],
  template: `
    <nz-drawer
      [nzVisible]="open()"
      [nzClosable]="false"
      [nzMaskClosable]="true"
      [nzWidth]="1120"
      [nzWrapClassName]="'reimbursement-detail-drawer'"
      [nzBodyStyle]="drawerBodyStyle"
      [nzMask]="false"
      [nzTitle]="drawerTitleTpl"
      (nzOnClose)="close.emit()"
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
        @if (claimId(); as id) {
          <app-reimbursement-detail-drawer-page [claimId]="id" />
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
        gap: 8px;
        align-items: center;
        min-width: 0;
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
export class ReimbursementDetailDrawerComponent {
  readonly open = input(false);
  readonly claimId = input<string | null>(null);
  readonly claim = input<ReimbursementClaimEntity | null>(null);
  readonly close = output<void>();

  readonly drawerBodyStyle = { padding: '18px 20px 24px', overflow: 'auto' };
  readonly titleText = computed(() => this.claim()?.reason || '报销单详情');
  readonly subtitleText = computed(() => this.claim()?.claimNo || this.claimId() || '');
}
