import { AfterViewChecked, AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, ViewChild, computed, effect, input, signal } from '@angular/core';
import { NzImageModule } from 'ng-zorro-antd/image';

interface ParsedNoteContent {
  text: string;
  images: string[];
}

@Component({
  selector: 'app-issue-detail-note',
  standalone: true,
  imports: [NzImageModule],
  template: `
    <div class="resolution" [class.resolution--timeline]="variant() === 'timeline'">
      @if (label()) {
        <div class="resolution__label">{{ label() }}</div>
      }
      <div
        #contentText
        class="resolution__content"
        [class.is-collapsed]="isOverflowing() && !expanded() && !hasImageContent()"
        [class.resolution__content--timeline]="variant() === 'timeline'"
      >
        @if (content(); as text) {
          @if (parsedContent().text) {
            <div>{{ parsedContent().text }}</div>
          }
          @if (parsedContent().images.length > 0) {
            <div class="resolution__images">
              <nz-image-group>
                @for (image of parsedContent().images; track image + '-' + $index) {
                  <img class="resolution__image" nz-image [nzSrc]="image" alt="" />
                }
              </nz-image-group>
            </div>
          }
        } @else {
          <ng-content></ng-content>
        }
      </div>
      @if (isOverflowing()) {
        @if (!expanded()) {
          <div class="resolution__ellipsis">......</div>
        }
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
      .resolution__images {
        margin-top: 8px;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .resolution__image {
        width: 120px;
        max-width: min(120px, 100%);
        height: 96px;
        border-radius: 8px;
        border: 1px solid var(--border-color-soft);
        object-fit: cover;
        background: var(--bg-subtle);
        cursor: zoom-in;
      }

      .resolution__content.is-collapsed {
        max-height: calc(1.7em * 2);
        overflow: hidden;
      }

      .resolution__ellipsis {
        margin-top: 2px;
        color: var(--text-muted);
        font-size: 12px;
        line-height: 1;
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
  readonly parsedContent = computed<ParsedNoteContent>(() => this.parseContent(this.content()));
  readonly hasImageContent = computed(() => this.parsedContent().images.length > 0);
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
    if (this.hasImageContent()) {
      if (this.overflowing()) {
        this.overflowing.set(false);
      }
      return;
    }

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

  private parseContent(content: string | null): ParsedNoteContent {
    const value = content?.trim();
    if (!value) {
      return { text: '', images: [] };
    }

    const lines = value.split(/\r?\n/);
    const textLines: string[] = [];
    const images: string[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        textLines.push('');
        continue;
      }
      const markdownImageMatch = trimmed.match(/^!\[[^\]]*]\(([^)]+)\)$/);
      if (markdownImageMatch && this.isLikelyImageUrl(markdownImageMatch[1] || '')) {
        images.push(markdownImageMatch[1]);
        continue;
      }
      if (this.isLikelyImageUrl(trimmed)) {
        images.push(trimmed);
        continue;
      }
      textLines.push(line);
    }

    return {
      text: textLines.join('\n').replace(/\n{3,}/g, '\n\n').trim(),
      images: Array.from(new Set(images)),
    };
  }

  private isLikelyImageUrl(value: string): boolean {
    const url = value.trim();
    if (!url) {
      return false;
    }
    if (/^https?:\/\/[^\s]+$/i.test(url) || /^\/[^\s]+$/.test(url)) {
      if (/\/api\/admin\/uploads\/[^/]+\/raw(?:$|\?)/i.test(url)) {
        return true;
      }
      if (/\.(png|jpe?g|gif|webp|bmp|svg)(?:$|\?)/i.test(url)) {
        return true;
      }
    }
    return false;
  }
}
