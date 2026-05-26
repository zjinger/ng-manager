import { Component, computed, input, signal } from '@angular/core';

import { MarkupNode } from './models/markup-node.model';

@Component({
  selector: 'app-markup-node',
  standalone: true,
  imports: [MarkupNodeComponent],
  template: `
    <!-- element -->
    @if (isElement()) {
      <div class="node" [style.padding-left.px]="(depth() + 1) * 16">
        <!-- toggle -->
        <div class="toggle-wrap">
          @if (hasChildren()) {
            <span class="toggle" (click)="toggle()">{{ collapsed() ? '▸' : '▾' }}</span>
          }
        </div>

        <!-- indent -->
        <!-- <div class="indent" [style.width.px]="depth() * 16"></div> -->

        <span class="bracket">&lt;</span>

        <span class="tag">{{ node().tagName }}</span>

        @for (attr of node().attributes ?? []; track attr.name) {
          <span class="attr-name">{{ attr.name }}</span>

          <span class="attr-operator"> = </span>

          <span class="attr-value">"{{ attr.value }}"</span>
        }

        @if (node().selfClosing) {
          <span class="bracket">/&gt;</span>
        } @else {
          <span class="bracket">&gt;</span>
        }

        @if (collapsed() && !node().selfClosing) {
          <span class="collapsed"> ... </span>

          <span class="bracket">&lt;/</span>

          <span class="tag">{{ node().tagName }}</span>

          <span class="bracket">&gt;</span>
        }
      </div>
      <div [class.hidden]="collapsed() && !node().selfClosing">
        <!-- @if (!collapsed() && !node().selfClosing) { -->
        @for (child of node().children ?? []; track child.path) {
          <app-markup-node [node]="child" [depth]="depth() + 1" />
        }

        <div class="node" [style.padding-left.px]="(depth() + 1) * 16">
          <div class="toggle-wrap"></div>

          <!-- <div class="indent" [style.width.px]="depth() * 16"></div> -->

          <span class="bracket">&lt;/</span>

          <span class="tag">{{ node().tagName }}</span>

          <span class="bracket">&gt;</span>
        </div>
        <!-- } -->
      </div>
    }

    <!-- text -->
    @if (isText()) {
      <div class="node" [style.padding-left.px]="(depth() + 1) * 16">
        <div class="toggle-wrap"></div>

        <!-- <div class="indent" [style.width.px]="depth() * 16"></div> -->

        <span class="text">{{ node().textContent }}</span>
      </div>
    }

    <!-- comment -->
    @if (isComment()) {
      <div class="node" [style.padding-left.px]="(depth() + 1) * 16">
        <div class="toggle-wrap"></div>

        <!-- <div class="indent" [style.width.px]="depth() * 16"></div> -->

        <span class="comment">&lt;!--{{ node().textContent }}-&gt;</span>
      </div>
    }
  `,
  styles: `
    .node {
      display: flex;
      flex-wrap: wrap;
      align-items: center;

      min-height: 24px;

      border-radius: 4px;

      // white-space: pre-wrap;
      word-break: break-word;
      position: relative;
      &:hover {
        background: #fafafa;
      }
    }

    .indent {
      flex-shrink: 0;
    }

    .hidden {
      display: none;
    }

    .toggle-wrap {
      width: 1rem;
      border-radius: 4px;
      flex-shrink: 0;

      display: flex;
      justify-content: center;

      position: absolute;
      left: 0;
      top: 0;
      &:hover {
        background: rgba(0, 0, 0, 0.06);
      }
    }

    .toggle {
      cursor: pointer;

      color: #595959;

      // font-size: 12px;

      user-select: none;
      transform: scale(200%);
    }

    .tag {
      white-space: nowrap;
      color: #307cd6;
    }

    .attr-name {
      color: #3aa3f0;
      margin-left: 8px;
      white-space: nowrap;
    }

    .attr-operator{
      margin:0 2px;
    }

    .attr-value {
      color: #ce834c;
    }

    .text {
      color: #262626;
    }

    .comment {
      color: #bfbfbf;
      font-style: italic;
    }

    .bracket {
      white-space: nowrap;
      color: #8c8c8c;
    }

    .collapsed {
      color: #bfbfbf;
      margin: 0 4px;
    }
  `,
})
export class MarkupNodeComponent {
  readonly node = input.required<MarkupNode>();

  readonly depth = input(0);

  readonly collapsed = signal(false);

  readonly isElement = computed(() => {
    return this.node().type === 'element';
  });

  readonly isText = computed(() => {
    return this.node().type === 'text';
  });

  readonly isComment = computed(() => {
    return this.node().type === 'comment';
  });

  readonly hasChildren = computed(() => {
    return !!this.node().children?.length;
  });

  toggle() {
    this.collapsed.update((v) => !v);
  }
}
