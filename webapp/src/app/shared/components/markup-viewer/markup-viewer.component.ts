import { Component, computed, input } from '@angular/core';

import { MarkupNodeComponent } from './markup-node.component';
import { buildMarkupTree } from './utils/markup-tree.utils';

@Component({
  selector: 'app-markup-viewer',
  standalone: true,
  imports: [MarkupNodeComponent],
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
