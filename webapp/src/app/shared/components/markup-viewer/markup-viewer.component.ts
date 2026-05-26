import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { MarkupNodeComponent } from './markup-node.component';
import { buildMarkupTree } from './utils/markup-tree.utils';

// TODO：复制显示器文本时得到的字符串应该和视觉上显示的字符串一致（去除span之间的多余空格等）
@Component({
  selector: 'app-markup-viewer',
  standalone: true,
  imports: [MarkupNodeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="markup-viewer">
      @for (node of tree(); track node.path) {
        <app-markup-node [node]="node" [depth]="0" />
      }
    </div>
  `,
  styles: `
    .markup-viewer {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;

      font-size: 13px;

      line-height: 1.7;
    }
  `,
})
export class MarkupViewerComponent {
  readonly content = input.required<string>();

  readonly tree = computed(() => {
    return buildMarkupTree(this.content());
  });
}
