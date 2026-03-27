import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzIconModule } from 'ng-zorro-antd/icon';

import type { RdItemEntity, RdLogEntity, RdStageEntity } from '../../models/rd.model';
import { RdDetailContentComponent } from '../rd-detail-content/rd-detail-content.component';

@Component({
  selector: 'app-rd-detail-drawer',
  standalone: true,
  imports: [
    NzDrawerModule,
    NzIconModule,
    RdDetailContentComponent,
  ],
  template: `
    <nz-drawer
      [nzVisible]="open()"
      [nzClosable]="false"
      [nzMaskClosable]="true"
      [nzWidth]="640"
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
        <app-rd-detail-content
          [busy]="busy()"
          [item]="item()"
          [logs]="logs()"
          [stages]="stages()"
          [canBlock]="canBlock()"
          [canEditProgress]="canEditProgress()"
          [canEditBasic]="canEditBasic()"
          [canStart]="canStart()"
          [canResume]="canResume()"
          [canComplete]="canComplete()"
          [canAdvance]="canAdvance()"
          [canDelete]="canDelete()"
          (actionClick)="actionClick.emit($event)"
          (progressChange)="progressChange.emit($event)"
          (basicSave)="basicSave.emit($event)"
          (deleteClick)="deleteClick.emit()"
        />
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
  readonly canBlock = input(false);
  readonly canEditProgress = input(false);
  readonly canEditBasic = input(false);
  readonly canStart = input(false);
  readonly canResume = input(false);
  readonly canComplete = input(false);
  readonly canAdvance = input(false);
  readonly canDelete = input(false);
  readonly actionClick = output<'start' | 'block' | 'resume' | 'complete' | 'advance'>();
  readonly deleteClick = output<void>();
  readonly progressChange = output<number>();
  readonly basicSave = output<{ title: string; description: string | null }>();
  readonly close = output<void>();

  readonly drawerBodyStyle = { padding: '18px 20px 24px', overflow: 'auto' };
  readonly titleText = computed(() => this.item()?.title || '研发项详情');
  readonly subtitleText = computed(() => this.item()?.rdNo || '');
}
