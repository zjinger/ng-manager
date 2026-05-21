import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { ReimbursementAttachmentEntity } from '@app/features/reimbursement/models/reimbursement.model';
import { AttachmentPreviewWallComponent, PanelCardComponent } from '@app/shared/ui';
import { mapReimbursementAttachmentToPreviewItem } from '../../utils/reimbursement-detail-display.util';

@Component({
  selector: 'app-reimbursement-attachments-panel',
  standalone: true,
  imports: [AttachmentPreviewWallComponent, PanelCardComponent],
  template: `
    <app-panel-card
      title="附件材料"
      [count]="attachments().length"
      [empty]="attachments().length === 0"
      emptyText="暂无附件"
    >
      <div class="attachments-body">
        <app-attachment-preview-wall
          [items]="attachmentItems()"
          [removable]="false"
          [showMeta]="true"
        />
      </div>
    </app-panel-card>
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }

      .attachments-body {
        padding: 16px 20px 20px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReimbursementAttachmentsPanelComponent {
  readonly attachments = input<ReimbursementAttachmentEntity[]>([]);

  readonly attachmentItems = computed(() => this.attachments().map((item) => mapReimbursementAttachmentToPreviewItem(item)));
}
