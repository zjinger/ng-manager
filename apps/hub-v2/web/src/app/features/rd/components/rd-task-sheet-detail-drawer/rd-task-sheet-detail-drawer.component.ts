import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzIconModule } from 'ng-zorro-antd/icon';

import { StatusBadgeComponent } from '@shared/ui';
import type { ProjectSummary } from '../../../projects/models/project.model';
import { RD_TASK_SHEET_STATUS_LABELS, type RdTaskSheetDetail, type RdTaskSheetStatus } from '../../models/rd-task-sheet.model';
import { RdTaskSheetAttachmentsPanelComponent } from './rd-task-sheet-attachments-panel.component';
import { RdTaskSheetDetailHeaderComponent } from './rd-task-sheet-detail-header.component';
import { RdTaskSheetLogsPanelComponent } from './rd-task-sheet-logs-panel.component';
import { RdTaskSheetMarkdownPanelComponent } from './rd-task-sheet-markdown-panel.component';
import { RdTaskSheetPropsPanelComponent } from './rd-task-sheet-props-panel.component';

type ConvertKind = 'rd' | 'issue';

@Component({
  selector: 'app-rd-task-sheet-detail-drawer',
  standalone: true,
  imports: [
    NzDrawerModule,
    NzIconModule,
    StatusBadgeComponent,
    RdTaskSheetDetailHeaderComponent,
    RdTaskSheetMarkdownPanelComponent,
    RdTaskSheetAttachmentsPanelComponent,
    RdTaskSheetLogsPanelComponent,
    RdTaskSheetPropsPanelComponent,
  ],
  template: `
    <nz-drawer
      [nzVisible]="open()"
      [nzClosable]="false"
      [nzMaskClosable]="true"
      [nzWidth]="900"
      [nzWrapClassName]="'rd-task-sheet-detail-drawer'"
      [nzBodyStyle]="drawerBodyStyle"
      [nzMask]="false"
      [nzTitle]="drawerTitleTpl"
      (nzOnClose)="close.emit()"
    >
      <ng-template #drawerTitleTpl>
        <div class="detail-drawer__title">
          <div class="detail-drawer__title-main">
            @if (detail(); as current) {
              <span class="detail-drawer__subtitle">{{ current.sheetNo }}</span>
              <strong>{{ current.title }}</strong>
              @if (current.status === 'draft') {
                <app-status-badge [status]="current.status" [label]="statusLabel(current.status)" />
              }
            } @else {
              <strong>任务单详情</strong>
            }
          </div>
          <button type="button" class="detail-drawer__close" (click)="close.emit()">
            <span nz-icon nzType="close"></span>
          </button>
        </div>
      </ng-template>

      <ng-template nzDrawerContent>
        @if (detail(); as current) {
          <div class="drawer-content">
            <div class="drawer-content__layout">
              <div class="drawer-content__column">
                <app-rd-task-sheet-detail-header
                  class="drawer-content__panel"
                  [detail]="current"
                  [busy]="busy()"
                  [exporting]="exporting()"
                  (exportWord)="exportWord.emit($event)"
                  (convert)="convert.emit($event)"
                  (edit)="edit.emit($event)"
                  (issue)="issue.emit($event)"
                  (submitReview)="submitReview.emit($event)"
                  (approveReview)="approveReview.emit($event)"
                  (returnReview)="returnReview.emit($event)"
                  (assign)="assign.emit($event)"
                  (startProcessing)="startProcessing.emit($event)"
                  (reply)="reply.emit($event)"
                  (closeSheet)="closeSheet.emit($event)"
                />
                <app-rd-task-sheet-markdown-panel
                  class="drawer-content__panel"
                  title="业务描述"
                  [content]="current.businessDescription"
                />
                <app-rd-task-sheet-markdown-panel
                  class="drawer-content__panel"
                  title="交付 / 答复内容"
                  [content]="current.deliveryContent"
                  emptyText="暂无回复"
                />
                <app-rd-task-sheet-attachments-panel
                  class="drawer-content__panel"
                  [detail]="current"
                  [busy]="busy()"
                  (upload)="upload.emit($event)"
                  (detach)="detach.emit($event)"
                />
                <app-rd-task-sheet-logs-panel class="drawer-content__panel" [logs]="current.logs" />
              </div>
              <app-rd-task-sheet-props-panel
                class="drawer-content__panel"
                [detail]="current"
                [projects]="projects()"
              />
            </div>
          </div>
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
        align-items: center;
        gap: 6px;
        min-width: 0;
      }
      .detail-drawer__title-main strong {
        min-width: 0;
        overflow: hidden;
        color: var(--text-primary);
        font-size: 18px;
        line-height: 1.2;
        text-overflow: ellipsis;
        white-space: nowrap;
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
        gap: 16px;
        padding: 20px;
      }
      .drawer-content__layout {
        display: grid;
        grid-template-columns: minmax(0, 1.35fr) minmax(296px, 0.65fr);
        gap: 16px;
        align-items: start;
      }
      .drawer-content__column {
        display: grid;
        gap: 16px;
        min-width: 0;
      }
      .drawer-content__panel {
        min-width: 0;
        display: block;
      }
      @media (max-width: 1000px) {
        .drawer-content__layout {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdTaskSheetDetailDrawerComponent {
  readonly open = input(false);
  readonly detail = input<RdTaskSheetDetail | null>(null);
  readonly projects = input<ProjectSummary[]>([]);
  readonly busy = input(false);
  readonly exporting = input(false);
  readonly close = output<void>();
  readonly exportWord = output<RdTaskSheetDetail>();
  readonly convert = output<ConvertKind>();
  readonly edit = output<RdTaskSheetDetail>();
  readonly issue = output<string>();
  readonly submitReview = output<string>();
  readonly approveReview = output<string>();
  readonly returnReview = output<RdTaskSheetDetail>();
  readonly assign = output<RdTaskSheetDetail>();
  readonly startProcessing = output<string>();
  readonly reply = output<RdTaskSheetDetail>();
  readonly closeSheet = output<string>();
  readonly upload = output<File[]>();
  readonly detach = output<{ sheetId: string; attachmentId: string }>();

  readonly drawerBodyStyle = { padding: '0', overflow: 'auto' };

  statusLabel(status: RdTaskSheetStatus): string {
    return RD_TASK_SHEET_STATUS_LABELS[status] ?? status;
  }
}
