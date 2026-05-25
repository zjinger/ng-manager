import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { MarkdownViewerComponent, PanelCardComponent } from '@shared/ui';

@Component({
  selector: 'app-rd-task-sheet-markdown-panel',
  standalone: true,
  imports: [PanelCardComponent, MarkdownViewerComponent],
  template: `
    <app-panel-card [title]="title()" [empty]="!content()" [emptyText]="emptyText()">
      <div class="markdown-panel">
        <app-markdown-viewer [content]="content() || ''" [showToc]="false" />
      </div>
    </app-panel-card>
  `,
  styles: [
    `
      .markdown-panel {
        padding: 16px;
        color: var(--text-secondary);
        line-height: 1.7;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdTaskSheetMarkdownPanelComponent {
  readonly title = input.required<string>();
  readonly content = input<string | null>('');
  readonly emptyText = input('暂无内容');
}
