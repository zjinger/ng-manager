import { Component, computed, input, signal } from '@angular/core';
import { EllipsisTextComponent } from '@app/shared/components/ellipsis-text/ellipsis-text.component';
import { MarkdownViewerComponent } from '@app/shared/components/markdown-viewer';
import { ISSUE_TITLE_BY_TYPE } from '@app/shared/constants/issue-type-options';
import { DetailItemCardComponent } from '@app/shared/ui/detail-item-card.component/detail-item-card.component';
import { IssueEntity } from '@pages/issues/models/issue.model';
import { extractAndRemoveImagePaths, replaceImagePaths } from '@app/utils/md-text';
import { NzImageDirective, NzImageModule } from 'ng-zorro-antd/image';
@Component({
  selector: 'app-issue-description-area',
  imports: [
    DetailItemCardComponent,
    MarkdownViewerComponent,
    NzImageModule,
    EllipsisTextComponent,
    NzImageDirective,
  ],
  template: `
    <app-detail-item-card [title]="getIssueTitleByType(issue())" maxHeight="550px">
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
          <div class="resolution-content">
            <app-ellipsis-text [lines]="2">
              {{ issue().resolutionSummary }}
            </app-ellipsis-text>
          </div>
        </div>
      }
      @if (issue().closeReason) {
        <div class="resolution">
          <div class="resolution-label">关闭原因</div>
          <div class="resolution-content">
            <app-ellipsis-text [lines]="2">
              {{ issue().closeReason }}
            </app-ellipsis-text>
          </div>
        </div>
      }
      @if (issue().closeRemark) {
        <div class="resolution">
          <div class="resolution-label">重开原因</div>
          <div class="resolution-content">
            <app-ellipsis-text [lines]="2">
              {{ closeRemarkContent().text }}
              <br />
              @for (imgUrl of closeRemarkContent().imgUrls; track imgUrl) {
                <img nz-image width="150px" height="100px" [nzSrc]="imgUrl" alt="" />
              }
            </app-ellipsis-text>
          </div>
        </div>
      }
    </app-detail-item-card>
  `,
  styles: `
    .empty {
      margin: 1rem;
      text-align: center;
      color: gray;
      font-size: 0.875rem;
    }
    .resolution {
      margin-top: 26px;
      .resolution-label {
        margin-bottom: 4px;
        font-size: 0.8rem;
        font-weight: bold;
        color: grey;
      }
      .resolution-content {
        font-size: 0.8rem;
        margin-bottom: 4px;
        // text-indent: 0.8rem;
      }
    }
  `,
})
export class IssueDescriptionAreaComponent {
  readonly issue = input.required<IssueEntity>();
  readonly projectId = input<string>('');

  readonly mdContent = computed(() => {
    return replaceImagePaths(
      this.issue().description || '',
      this.projectId(),
      this.issue().id,
      'issues',
    );
  });

  closeRemarkContent = computed(() => {
    const issue = this.issue();
    if (!issue)
      return {
        text: '',
        imgUrls: [],
      };
    return extractAndRemoveImagePaths(
      issue.closeRemark || '',
      this.projectId(),
      this.issue().id,
      'issues',
    );
  });

  // 获取描述标题
  getIssueTitleByType(issue: IssueEntity): string {
    const item = ISSUE_TITLE_BY_TYPE.find((i) => i.type === issue.type);
    return item ? item.title : '问题描述';
  }
}
