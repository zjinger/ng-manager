import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { JsonNodeComponent } from './json-node.component';
import { buildJsonTree } from './utils/json-tree.utils';

// TODO：复制显示器文本时得到的字符串应该和视觉上显示的字符串一致（去除span之间的多余空格等）
@Component({
  selector: 'app-json-viewer',
  standalone: true,
  imports: [JsonNodeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (parseError()) {
      <div class="error">JSON 格式错误</div>
    } @else if (tree()) {
      <div class="json-viewer">
        <app-json-node [node]="tree()!" [depth]="0" />
      </div>
    }
  `,
  styles: `
    .json-viewer {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;

      font-size: 13px;
      line-height: 1.6;
    }

    .error {
      color: #ff4d4f;
    }
  `,
})
export class JsonViewerComponent {
  /** JSON 字符串 */
  readonly json = input.required<string>();

  /** 解析后的 JSON */
  readonly parsed = computed(() => {
    try {
      return JSON.parse(this.json());
    } catch {
      return null;
    }
  });

  readonly parseError = computed(() => {
    try {
      JSON.parse(this.json());
      return false;
    } catch {
      return true;
    }
  });

  readonly tree = computed(() => {
    const value = this.parsed();

    if (value == null) {
      return null;
    }

    return buildJsonTree(value);
  });
}
