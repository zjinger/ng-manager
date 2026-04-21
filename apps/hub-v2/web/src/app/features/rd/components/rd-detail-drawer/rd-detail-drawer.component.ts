import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzIconModule } from 'ng-zorro-antd/icon';

import type { RdItemEntity, RdLogEntity, RdStageEntity, RdStageHistoryEntry } from '../../models/rd.model';
import { RdDetailContentComponent } from '../rd-detail-content/rd-detail-content.component';
import { RdProgressPanelComponent, type MemberProgressItem } from '../rd-progress-panel/rd-progress-panel.component';

@Component({
  selector: 'app-rd-detail-drawer',
  standalone: true,
  imports: [
    NzDrawerModule,
    NzIconModule,
    RdDetailContentComponent,
    RdProgressPanelComponent,
  ],
  template: `
    <nz-drawer
      [nzVisible]="open()"
      [nzClosable]="false"
      [nzMaskClosable]="true"
      [nzWidth]="900"
      [nzWrapClassName]="'rd-detail-drawer'"
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
        <div class="drawer-content">
          <div class="drawer-content__main">
            <app-rd-detail-content
              [busy]="busy()"
              [item]="item()"
              [logs]="logs()"
              [stages]="stages()"
              [flowActionPlacement]="'below-flow'"
              [stageHistory]="stageHistory()"
              [memberProgressList]="memberProgressList()"
              [canEditBasic]="canEditBasic()"
              [canAdvance]="canAdvance()"
              [canAccept]="canAccept()"
              [canClose]="canClose()"
              [showSummary]="false"
              [showProps]="false"
              [showStageHistory]="false"
              [showActivity]="false"
              (actionClick)="actionClick.emit($event)"
              (editRequest)="editRequest.emit()"
            />
            @if (item(); as current) {
              <app-rd-progress-panel
                [item]="current"
                [memberProgressList]="memberProgressList()"
                [currentUserId]="currentUserId() || ''"
                (updateProgressClick)="updateProgressClick.emit($event)"
              />
            }
            <app-rd-detail-content
              [busy]="busy()"
              [item]="item()"
              [logs]="logs()"
              [stages]="stages()"
              [stageHistory]="stageHistory()"
              [memberProgressList]="memberProgressList()"
              [canEditBasic]="canEditBasic()"
              [canAdvance]="canAdvance()"
              [canAccept]="canAccept()"
              [canClose]="canClose()"
              [showAction]="false"
              [showProps]="false"
              (actionClick)="actionClick.emit($event)"
              (editRequest)="editRequest.emit()"
            />
          </div>
          <div class="drawer-content__side">
            <app-rd-detail-content
              [busy]="busy()"
              [item]="item()"
              [logs]="logs()"
              [stages]="stages()"
              [stageHistory]="stageHistory()"
              [memberProgressList]="memberProgressList()"
              [canEditBasic]="canEditBasic()"
              [canAdvance]="canAdvance()"
              [canAccept]="canAccept()"
              [canClose]="canClose()"
              [showSummary]="false"
              [showActivity]="false"
              [showAction]="false"
              [showStageHistory]="false"
              (actionClick)="actionClick.emit($event)"
              (editRequest)="editRequest.emit()"
            />
          </div>
        </div>
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
        align-items: center;
        gap: 6px;
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
      .drawer-content {
        display: grid;
        grid-template-columns: 1fr 300px;
        gap: 20px;
        padding: 20px;
      }
      .drawer-content__main {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .drawer-content__side {
        min-width: 0;
      }
      @media (max-width: 900px) {
        .drawer-content {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdDetailDrawerComponent {
  readonly busy = input(false);
  readonly open = input(false);
  readonly item = input<RdItemEntity | null>(null);
  readonly logs = input<RdLogEntity[]>([]);
  readonly stages = input<RdStageEntity[]>([]);
  readonly stageHistory = input<RdStageHistoryEntry[]>([]);
  readonly canEditBasic = input(false);
  readonly canAdvance = input(false);
  readonly canAccept = input(false);
  readonly canClose = input(false);
  readonly memberProgressList = input<MemberProgressItem[]>([]);
  readonly currentUserId = input<string>('');
  readonly actionClick = output<'advance' | 'accept' | 'close' | 'reopen'>();
  readonly editRequest = output<void>();
  readonly updateProgressClick = output<{ userId: string; memberName: string; currentProgress: number; quickStart?: boolean }>();
  readonly close = output<void>();

  readonly drawerBodyStyle = { padding: '0', overflow: 'auto' };
  readonly titleText = computed(() => this.item()?.title || '研发项详情');
  readonly subtitleText = computed(() => this.item()?.rdNo || '');
}
