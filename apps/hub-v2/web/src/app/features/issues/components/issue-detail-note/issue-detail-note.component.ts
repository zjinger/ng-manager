import { AfterViewChecked, AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, ViewChild, computed, effect, input, signal } from '@angular/core';

@Component({
  selector: 'app-issue-detail-note',
  standalone: true,
  template: `
    <div class="resolution" [class.resolution--timeline]="variant() === 'timeline'">
      @if (label()) {
        <div class="resolution__label">{{ label() }}</div>
      }
      <div
        #contentText
        class="resolution__content"
        [class.is-collapsed]="isOverflowing() && !expanded()"
        [class.resolution__content--timeline]="variant() === 'timeline'"
      >
        @if (content(); as text) {
          {{ text }}
        } @else {
          <ng-content></ng-content>
        }
      </div>
      @if (isOverflowing()) {
        <button type="button" class="resolution__toggle" (click)="toggleExpanded()">
          {{ expanded() ? '收起' : '展开' }}
        </button>
      }
    </div>
  `,
  styles: [
    `
      .resolution {
        margin-top: 22px;
        padding: 18px 20px 0;
        border-top: 1px solid var(--border-color);
        color: var(--text-secondary);
      }

      .resolution--timeline {
        margin-top: 0;
        padding: 0;
        border-top: 0;
        color: inherit;
      }

      .resolution__label {
        margin-bottom: 8px;
        font-size: 12px;
        font-weight: 700;
        color: var(--text-muted);
        letter-spacing: 0.04em;
      }

      .resolution__content {
        position: relative;
        line-height: 1.7;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .resolution__content--timeline {
        color: inherit;
      }

      .resolution__content.is-collapsed {
        max-height: calc(1.7em * 2);
        overflow: hidden;
      }

      .resolution__content.is-collapsed::after {
        content: '......';
        position: absolute;
        right: 0;
        bottom: 0;
        padding-left: 10px;
        background: linear-gradient(90deg, transparent, var(--bg-container) 40%);
      }

      .resolution__toggle {
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

      .resolution__toggle:hover {
        color: var(--primary-700);
      }

      :host-context(html[data-theme='dark']) .resolution__content.is-collapsed::after {
        background: linear-gradient(90deg, transparent, var(--bg-container) 34%);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssueDetailNoteComponent implements AfterViewInit, AfterViewChecked {
  @ViewChild('contentText')
  private readonly contentElement?: ElementRef<HTMLElement>;

  readonly label = input<string | null>(null);
  readonly content = input<string | null>(null);
  readonly variant = input<'detail' | 'timeline'>('detail');
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
