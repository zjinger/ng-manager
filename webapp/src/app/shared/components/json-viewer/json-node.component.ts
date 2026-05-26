import { Component, computed, input, signal } from '@angular/core';

import { JsonNode } from './models/json.node.model';
@Component({
  selector: 'app-json-node',
  standalone: true,
  imports: [JsonNodeComponent],
  template: `
    <div class="node" [style.paddingLeft.px]="(depth() + 1) * 16">
      <!-- toggle 占位 -->
      <div class="toggle-wrap">
        @if (isObject() || isArray()) {
          <span class="toggle" (click)="updateCollapsed()">{{ collapsed() ? '▸' : '▾' }}</span>
        }
      </div>
      <!-- 缩进 -->
      <!-- <div class="indent" [style.width.px]="depth() * 16"></div> -->

      <!-- key -->
      @if (node().key !== undefined) {
        <span class="key">"{{ node().key }}"</span>
        <span>: </span>
      }

      <!-- object -->
      @if (isObject()) {
        <span class="brace">{{ '{' }}</span>

        @if (collapsed()) {
          <span class="meta">{{ node().children?.length + ' items ... ' }}</span>
          <span class="close">{{ '}' }}</span>
        }
      }

      <!-- array -->
      @if (isArray()) {
        <span class="brace">[</span>

        @if (collapsed()) {
          <span class="meta">{{ node().children?.length + ' items ... ' }}</span>
          <span class="close">{{ ']' }}</span>
        }
      }

      <!-- primitive -->
      @if (isPrimitive()) {
        <span [class]="valueClass()">{{ formatValue() }}</span>
      }
    </div>

    <!-- children -->
    <div class="children" [class.hidden]="collapsed()">
      @for (child of node().children ?? []; track child.path) {
        <app-json-node [node]="child" [depth]="depth() + 1" />
      }
      <!-- 缩进 -->
      <!-- close -->
      @if (isObject()) {
        <div class="node" [style.paddingLeft.px]="(depth() + 1) * 16">
          <!-- <div class="indent" [style.width.px]="depth() * 16 + 16"></div> -->
          <span class="close">{{ '}' }}</span>
        </div>
      }

      @if (isArray()) {
        <div class="node" [style.paddingLeft.px]="(depth() + 1) * 16">
          <!-- <div class="indent" [style.width.px]="depth() * 16 + 16"></div> -->
          <span class="close">{{ ']' }}</span>
        </div>
      }
    </div>
  `,
  styles: `
    .node {
      display: flex;
      align-items: flex-start;

      white-space: pre-wrap;
      word-break: break-word;
      position: relative;
      &:hover {
        background: rgba(0, 0, 0, 0.03);
      }
    }

    .indent {
      flex-shrink: 0;
    }

    .toggle-wrap {
      width: 1rem;
      border-radius: 4px;
      flex-shrink: 0;

      display: flex;
      justify-content: center;
      position: absolute;
      top: 0;
      left: 0;
      &:hover {
        background: rgba(0, 0, 0, 0.06);
      }
    }
    .hidden {
      display: none;
    }

    .toggle {
      color: #595959;
      cursor: pointer;
      // font-size: 1.5rem;
      // line-height: 0.4rem;
      user-select: none;
      transform: scale(200%);
    }

    .content {
      flex: 1;
    }

    .key {
      white-space: nowrap;
      color: #3d8bff;
    }

    .string {
      color: #d97058;
    }

    .number {
      color: #7fb87a;
    }

    .boolean {
      color: #3b82d6;
    }

    .null {
      color: #545454;
    }

    .brace {
      color: #a6a6a6;
    }

    .close {
      color: #a6a6a6;
    }

    .meta {
      color: #545454;
      margin-left: 4px;
    }
  `,
})
export class JsonNodeComponent {
  readonly node = input.required<JsonNode>();

  readonly depth = input(0);

  readonly collapsed = signal(false);

  readonly isObject = computed(() => {
    return this.node().type === 'object';
  });

  readonly isArray = computed(() => {
    return this.node().type === 'array';
  });

  readonly isPrimitive = computed(() => {
    return this.node().type !== 'object' && this.node().type !== 'array';
  });

  readonly valueClass = computed(() => {
    return this.node().type;
  });

  updateCollapsed() {
    this.collapsed.update((v) => !v);
  }

  formatValue() {
    const node = this.node();

    switch (node.type) {
      case 'string':
        return `"${node.value}"`;

      case 'null':
        return 'null';

      default:
        return String(node.value);
    }
  }
}
