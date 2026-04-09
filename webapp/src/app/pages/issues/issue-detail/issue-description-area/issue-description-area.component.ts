import { Component, computed, input, signal } from '@angular/core';
import { MarkdownViewerComponent } from '@app/shared/components/markdown-viewer';
import { DetailItemCardComponent } from '@app/shared/ui/detail-item-card.component/detail-item-card.component';
import { IssueEntity } from '@pages/issues/models/issue.model';

@Component({
  selector: 'app-issue-description-area',
  imports: [DetailItemCardComponent, MarkdownViewerComponent],
  template: `
    <app-detail-item-card title="描述" maxHeight="550px">
      @if (mdContent(); as des) {
        <app-markdown-viewer
          [content]="des"
          [showToc]="true"
          [tocVariant]="'floating'"
          [tocCollapsedByDefault]="true"
        ></app-markdown-viewer>
      } @else {
        <div class="empty">暂无描述</div>
      }
      @if (issue().resolutionSummary) {
        <div class="resolution">
          <div class="resolution-label">解决说明</div>
          <div class="resolution-content">{{ issue().resolutionSummary }}</div>
        </div>
      }
      @if (issue().closeRemark) {
        <div class="resolution">
          <div class="resolution-label">关闭原因</div>
          <div class="resolution-content">{{ issue().closeRemark }}</div>
        </div>
      }
    </app-detail-item-card>
  `,
  styles: `
    .empty {
      margin: 1rem;
      text-align: center;
      color: gray;
    }
    .resolution {
      margin-top: 26px;
      .resolution-label {
        font-size: 0.8rem;
        font-weight: bold;
        color: grey;
      }
      .resolution-content {
        font-size: 0.8rem;
        text-indent: 0.8rem;
      }
    }
  `,
})
export class IssueDescriptionAreaComponent {
  readonly issue = input.required<IssueEntity>();
  readonly projectId = input<string>('');

  readonly mdContent = computed(() => {
    return this.replaceImagePaths(
      this.issue().description || '',
      this.projectId(),
      this.issue().id,
    );
  });

  private replaceImagePaths(mdContent: string, projectId: string, issueId: string) {
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
      const newPath = `/api/client/hub-token/projects/${projectId}/issues/${issueId}/attachments/${itemId}/raw`;

      return match.replace(originalPath, newPath);
    });
  }
}
