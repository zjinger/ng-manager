import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  ViewChild,
  input,
  signal,
  effect,
  computed,
  OnDestroy,
} from '@angular/core';

@Component({
  selector: 'app-ellipsis-text',
  imports: [CommonModule],
  template: `
    <span #textRef class="text" [class.expanded]="expanded()" [style.--line-clamp]="lines()">
      @if (!hasTextInput()) {
        <ng-content></ng-content>
      } @else {
        <ng-container *ngTemplateOutlet="textTpl"></ng-container>
      }

      <ng-template #textTpl>
        {{ text() }}
      </ng-template>
    </span>

    @if (showToggle() && enableToggle()) {
      <a class="toggle" (click)="toggle()">
        {{ expanded() ? '收起' : '展开' }}
      </a>
    }
  `,
  styles: `
    .text {
      display: -webkit-box;
      -webkit-box-orient: vertical;
      overflow: hidden;
      word-break: break-word;

      -webkit-line-clamp: var(--line-clamp);
    }

    .text.expanded {
      -webkit-line-clamp: unset !important;
    }

    .toggle {
      font-size: 0.8rem;
      font-weight: bold;
      color: #1677ff;
      cursor: pointer;
      user-select: none;
    }
  `,
})
export class EllipsisTextComponent implements AfterViewInit, OnDestroy {
  text = input<string>('');
  lines = input<number>(2);
  enableToggle = input<boolean>(true);

  @ViewChild('textRef') textRef!: ElementRef;

  private observer?: MutationObserver;

  expanded = signal(false);
  showToggle = signal(false);

  // 是否使用 text 输入（否则走 ng-content）
  hasTextInput = computed(() => !!this.text());

  ngAfterViewInit() {
    this.checkOverflow();
    this.initObserver();
  }

  ngOnDestroy() {
    this.observer?.disconnect();
  }

  constructor() {
    // 当 text 或 lines 变化时重新计算
    effect(() => {
      this.text();
      this.lines();

      // 等 DOM 更新
      setTimeout(() => this.checkOverflow());
    });
  }

  // 插槽内容Observer
  private initObserver() {
    const el = this.textRef?.nativeElement;
    if (!el) return;

    this.observer = new MutationObserver(() => {
      this.checkOverflow();
    });

    this.observer.observe(el, {
      childList: true, // 子节点变化
      subtree: true, // 深层变化
      characterData: true, // 文本变化
    });
  }

  private checkOverflow() {
    // 先收起，才能正确测量
    this.toggle(false);
    this.showToggle.set(false);

    const el = this.textRef?.nativeElement;
    if (!el) return;
    requestAnimationFrame(() => this.showToggle.set(el.scrollHeight > el.clientHeight));
  }

  // 切换文本展开/收起
  toggle(expanded?: boolean) {
    if (expanded !== undefined) {
      this.expanded.set(expanded);
    } else {
      this.expanded.update((v) => !v);
    }
  }
}
