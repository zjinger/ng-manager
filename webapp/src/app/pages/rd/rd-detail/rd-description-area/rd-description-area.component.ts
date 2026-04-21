import { Component, computed, input } from '@angular/core';
import { MarkdownViewerComponent } from '@app/shared/components/markdown-viewer';
import { DetailItemCardComponent } from '@app/shared/ui/detail-item-card.component/detail-item-card.component';
import { RdItemEntity, RdLogEntity } from '@pages/rd/models/rd.model';

@Component({
  selector: 'app-rd-description-area',
  imports: [MarkdownViewerComponent, DetailItemCardComponent],
  template: `
    <app-detail-item-card [title]="'研发项描述'">
      <div class="description-container">
        <app-markdown-viewer
          [content]="mdContent()"
          [showToc]="true"
          [tocVariant]="'floating'"
          [tocCollapsedByDefault]="true"
        ></app-markdown-viewer>
        @if (!mdContent()) {
          <div class="empty">暂无研发项描述</div>
        }
      </div>

      @for (note of detailNotes(); track note.id) {
        <div class="note">
          <div class="note-label">{{ note.label }}</div>
          <div class="note-content">{{ note.content }}</div>
        </div>
      }
    </app-detail-item-card>
  `,
  styles: `
    .description-container {
      margin-bottom: 10px;
      max-height: 500px;
      overflow-y: auto;
      .empty {
        width: 100%;
        text-align: center;
        font-size: 0.875rem;
        color: gray;
      }
    }
    .note {
      padding: 1rem 0;
      border-top: 1px solid #ebedf0;
      .note-label {
        margin-bottom: 4px;
        font-size: 0.8rem;
        font-weight: bold;
        color: grey;
      }
      .note-content {
        font-size: 0.8rem;
        text-indent: 0.8rem;
      }
    }
  `,
})
export class RdDescriptionAreaComponent {
  readonly rdItem = input.required<RdItemEntity>();
  readonly projectId = input.required<string>();
  readonly logs = input<RdLogEntity[]>([]);

  // 研发项描述md文档
  readonly mdContent = computed(() => {
    const rdItem = this.rdItem();
    if (!rdItem) return '';
    return this.replaceImagePaths(rdItem.description || '', this.projectId(), rdItem.id);
  });

  readonly detailNotes = computed(() => {
    const logs = [...this.logs()].reverse();
    const notes: Array<{ id: string; label: string; content: string }> = [];

    for (const log of logs) {
      const content = log.content?.trim() || '';
      if (!content) {
        continue;
      }

      if (log.actionType === 'advance_stage') {
        const descMatch = content.match(/(?:^|；)\s*说明[:：]\s*(.+)$/);
        const desc = descMatch?.[1]?.trim();
        if (!desc) {
          continue;
        }
        const stageMatch = content.match(/推进阶段[:：]\s*.+?\s*->\s*([^；]+)/);
        const stageName = stageMatch?.[1]?.trim() || '该';
        notes.push({
          id: `advance-${log.id}`,
          label: `${stageName}阶段描述`,
          content: desc,
        });
        continue;
      }

      if (log.actionType === 'close') {
        const reasonMatch = content.match(/关闭研发项[:：]\s*(.+)$/);
        const reason = reasonMatch?.[1]?.trim();
        if (!reason) {
          continue;
        }
        notes.push({
          id: `close-${log.id}`,
          label: '关闭原因',
          content: reason,
        });
      }
    }

    return notes;
  });

  private replaceImagePaths(mdContent: string, projectId: string, rdId: string) {
    // 正则表达式匹配Markdown中的图片路径
    const regex = /!\[.*?\]\((\/api\/admin\/uploads\/[a-zA-Z0-9_-]+\/raw)\)/g;

    // 替换匹配到的图片路径
    return mdContent.replace(regex, (match: string, originalPath: string) => {
      // 提取原路径中的 uploadId (例如upl_mnk0hxvl4xt7)
      const matchResult = originalPath.match(/uploads\/([a-zA-Z0-9_-]+)/);

      if (!matchResult) {
        return match;
      }
      const itemId = matchResult[1];
      const newPath = `/api/client/hub-token/projects/${projectId}/rd-items/${rdId}/uploads/${itemId}/raw`;

      return match.replace(originalPath, newPath);
    });
  }
}
