import { AfterViewChecked, AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, ViewChild, computed, effect, input, signal } from '@angular/core';

import { MarkdownViewerComponent } from '@shared/ui';

@Component({
  selector: 'app-rd-detail-note',
  standalone: true,
  imports: [MarkdownViewerComponent],
  template: `
    <div class="rd-note">
      @if (label()) {
        <div class="rd-note__label">{{ label() }}</div>
      }
      <div #contentBody class="rd-note__content" [class.is-collapsed]="isOverflowing() && !expanded()">
        <app-markdown-viewer [content]="content() || ''" [showToc]="false"></app-markdown-viewer>
      </div>
      @if (isOverflowing()) {
        @if (!expanded()) {
          <div class="rd-note__ellipsis">......</div>
        }
        <button type="button" class="rd-note__toggle" (click)="toggleExpanded()">
          {{ expanded() ? '收起' : '展开' }}
        </button>
      }
    </div>
  `,
  styles: [
    `
      .rd-note {
        margin-top: 22px;
        padding: 18px 20px 0;
        border-top: 1px solid var(--border-color);
        color: var(--text-secondary);
      }

      .rd-note__label {
        margin-bottom: 8px;
        font-size: 12px;
        font-weight: 700;
        color: var(--text-muted);
        letter-spacing: 0.04em;
      }

      .rd-note__content {
        position: relative;
        line-height: 1.7;
        word-break: break-word;
      }

      .rd-note__content.is-collapsed {
        max-height: calc(1.7em * 2);
        overflow: hidden;
      }

      .rd-note__ellipsis {
        margin-top: 2px;
        color: var(--text-muted);
        font-size: 12px;
        line-height: 1;
      }

      .rd-note__toggle {
        display: inline-flex;
        align-items: center;
        margin-top: 6px;
        padding: 0;
        border: 0;
        background: transparent;
        color: var(--primary-600);
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
      }

      .rd-note__toggle:hover {
        color: var(--primary-700);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdDetailNoteComponent implements AfterViewInit, AfterViewChecked {
  @ViewChild('contentBody')
  private readonly contentElement?: ElementRef<HTMLElement>;

  readonly label = input<string | null>(null);
  readonly content = input<string | null>(null);
  readonly expanded = signal(false);
  private readonly overflowing = signal(false);
  readonly isOverflowing = computed(() => this.overflowing());
  private measureScheduled = false;

  constructor() {
    effect(() => {
      this.content();
      this.expanded.set(false);
      this.scheduleMeasure();
    });
  }

  ngAfterViewInit(): void {
    this.scheduleMeasure();
  }

  ngAfterViewChecked(): void {
    this.scheduleMeasure();
  }

  toggleExpanded(): void {
    this.expanded.update((value) => !value);
  }

  private scheduleMeasure(): void {
    if (this.measureScheduled) {
      return;
    }
    this.measureScheduled = true;
    queueMicrotask(() => this.measureOverflow());
  }

  private measureOverflow(): void {
    this.measureScheduled = false;
    const element = this.contentElement?.nativeElement;
    if (!element) {
      return;
    }
    const lineHeightValue = Number.parseFloat(getComputedStyle(element).lineHeight || '');
    const lineHeight = Number.isFinite(lineHeightValue) ? lineHeightValue : 20;
    const nextOverflowing = element.scrollHeight > lineHeight * 2 + 2;
    if (this.overflowing() !== nextOverflowing) {
      this.overflowing.set(nextOverflowing);
    }
  }
}
