import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild, inject } from '@angular/core';
import { NzImageModule, NzImageService } from 'ng-zorro-antd/image';
import { MarkdownModule } from 'ngx-markdown';

@Component({
    selector: 'app-markdown-viewer',
    standalone: true,
    imports: [CommonModule, MarkdownModule, NzImageModule],
    templateUrl: './markdown-viewer.component.html',
    styleUrls: ['./markdown-viewer.component.less'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MarkdownViewerComponent implements OnChanges, OnDestroy {
    private readonly imageService = inject(NzImageService);
    private readonly cdr = inject(ChangeDetectorRef);

    @ViewChild('viewerRef', { static: true })
    viewerRef!: ElementRef<HTMLElement>;

    @Input() content = '';
    @Input() showToc = true;
    @Input() tocVariant: 'inline' | 'floating' = 'inline';
    @Input() tocCollapsedByDefault = false;

    tocItems: Array<{ id: string; text: string; level: number }> = [];
    activeTocId: string | null = null;
    tocCollapsed = false;
    private headingElements: HTMLElement[] = [];
    private scrollContainer: HTMLElement | Window | null = null;
    private scrollListener: (() => void) | null = null;

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['content'] || changes['showToc'] || changes['tocCollapsedByDefault'] || changes['tocVariant']) {
            queueMicrotask(() => this.buildToc());
        }
    }

    onMarkdownReady(): void {
        this.buildToc();
    }

    ngOnDestroy(): void {
        this.teardownScrollTracking();
    }

    jumpToHeading(id: string): void {
        const host = this.viewerRef?.nativeElement;
        const target = host?.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
        if (!target) {
            return;
        }

        this.activeTocId = id;
        this.cdr.markForCheck();
        queueMicrotask(() => this.ensureActiveTocItemVisible());

        const container = this.scrollContainer instanceof HTMLElement ? this.scrollContainer : null;
        const topOffset = 16;
        if (container) {
            const containerRect = container.getBoundingClientRect();
            const targetRect = target.getBoundingClientRect();
            const nextTop = container.scrollTop + (targetRect.top - containerRect.top) - topOffset;
            container.scrollTo({ top: Math.max(0, nextTop), behavior: 'smooth' });
            return;
        }

        const viewportTop = target.getBoundingClientRect().top + window.scrollY - 88;
        window.scrollTo({ top: Math.max(0, viewportTop), behavior: 'smooth' });
    }

    toggleToc(): void {
        this.tocCollapsed = !this.tocCollapsed;
    }

    onContentClick(event: MouseEvent): void {
        const target = event.target as HTMLElement | null;
        const image = target?.closest('img') as HTMLImageElement | null;
        if (!image?.src) {
            return;
        }

        const host = this.viewerRef?.nativeElement;
        const imageElements = host
            ? Array.from(host.querySelectorAll('img'))
            : [image];
        const previewImages = imageElements
            .map((item) => ({
                src: item.currentSrc || item.src,
                alt: item.alt || undefined
            }))
            .filter((item) => !!item.src);
        const index = Math.max(
            0,
            imageElements.findIndex((item) => item === image)
        );

        if (previewImages.length === 0) {
            return;
        }
        const previewRef = this.imageService.preview(previewImages, {
            nzMaskClosable: true,
            nzKeyboard: true
        });
        if (index > 0) {
            previewRef.switchTo(index);
        }
    }

    private buildToc(): void {
        if (!this.showToc) {
            this.tocItems = [];
            this.activeTocId = null;
            this.tocCollapsed = true;
            this.teardownScrollTracking();
            this.cdr.markForCheck();
            return;
        }

        const host = this.viewerRef?.nativeElement;
        if (!host) {
            this.tocItems = [];
            this.activeTocId = null;
            this.tocCollapsed = this.resolveInitialTocCollapsed();
            this.teardownScrollTracking();
            this.cdr.markForCheck();
            return;
        }

        const headings = Array.from(host.querySelectorAll<HTMLElement>('h1, h2, h3'));
        const duplicateCount = new Map<string, number>();
        const items: Array<{ id: string; text: string; level: number }> = [];

        for (let index = 0; index < headings.length; index += 1) {
            const heading = headings[index];
            const text = (heading.textContent || '').trim();
            if (!text) {
                continue;
            }
            const level = Number(heading.tagName.slice(1)) || 1;
            let slug = this.slugify(text) || `section-${index + 1}`;
            const count = duplicateCount.get(slug) ?? 0;
            duplicateCount.set(slug, count + 1);
            if (count > 0) {
                slug = `${slug}-${count + 1}`;
            }

            heading.id = heading.id || slug;
            items.push({ id: heading.id, text, level });
        }

        this.tocItems = items;
        this.activeTocId = items[0]?.id ?? null;
        this.tocCollapsed = this.resolveInitialTocCollapsed();
        this.setupScrollTracking(host, headings);
        this.cdr.markForCheck();
    }

    private setupScrollTracking(host: HTMLElement, headings: HTMLElement[]): void {
        this.teardownScrollTracking();
        if (headings.length === 0) {
            return;
        }

        this.headingElements = headings;
        const container = this.findScrollContainer(host);
        this.scrollContainer = container ?? window;
        this.scrollListener = () => this.syncActiveHeading();
        this.scrollContainer.addEventListener('scroll', this.scrollListener, { passive: true });
        window.addEventListener('resize', this.scrollListener, { passive: true });
        this.syncActiveHeading();
    }

    private teardownScrollTracking(): void {
        if (this.scrollListener) {
            this.scrollContainer?.removeEventListener('scroll', this.scrollListener as EventListener);
            window.removeEventListener('resize', this.scrollListener as EventListener);
        }
        this.headingElements = [];
        this.scrollContainer = null;
        this.scrollListener = null;
    }

    private syncActiveHeading(): void {
        if (this.headingElements.length === 0) {
            return;
        }

        const threshold = 96;
        let active = this.headingElements[0];
        const container = this.scrollContainer instanceof HTMLElement ? this.scrollContainer : null;

        if (container) {
            const containerRect = container.getBoundingClientRect();
            const current = container.scrollTop + threshold;
            const maxScrollTop = Math.max(container.scrollHeight - container.clientHeight, 0);
            const nearBottom = maxScrollTop - container.scrollTop <= 2;

            if (nearBottom) {
                active = this.headingElements[this.headingElements.length - 1];
            }

            for (const heading of this.headingElements) {
                const headingRect = heading.getBoundingClientRect();
                const top = headingRect.top - containerRect.top + container.scrollTop;
                if (top <= current) {
                    active = heading;
                } else {
                    break;
                }
            }
        } else {
            for (const heading of this.headingElements) {
                const top = heading.getBoundingClientRect().top;
                if (top <= threshold) {
                    active = heading;
                } else {
                    break;
                }
            }
        }

        if (!active.id || active.id === this.activeTocId) {
            return;
        }

        this.activeTocId = active.id;
        this.cdr.markForCheck();
        queueMicrotask(() => this.ensureActiveTocItemVisible());
    }

    private ensureActiveTocItemVisible(): void {
        const host = this.viewerRef?.nativeElement;
        if (!host || !this.activeTocId) {
            return;
        }

        const item = host.querySelector<HTMLElement>(
            `.markdown-toc__item[data-toc-id="${CSS.escape(this.activeTocId)}"]`
        );
        if (!item) {
            return;
        }

        const container = item.closest<HTMLElement>('.markdown-toc--floating, .markdown-toc');
        if (!container) {
            return;
        }

        const itemTop = item.offsetTop;
        const itemBottom = itemTop + item.offsetHeight;
        const viewTop = container.scrollTop;
        const viewBottom = viewTop + container.clientHeight;

        if (itemTop < viewTop) {
            container.scrollTop = Math.max(itemTop - 8, 0);
        } else if (itemBottom > viewBottom) {
            container.scrollTop = itemBottom - container.clientHeight + 8;
        }
    }

    private findScrollContainer(element: HTMLElement): HTMLElement | null {
        let current: HTMLElement | null = element.parentElement;
        while (current) {
            const style = getComputedStyle(current);
            const overflowY = style.overflowY;
            if ((overflowY === 'auto' || overflowY === 'scroll') && current.scrollHeight > current.clientHeight) {
                return current;
            }
            current = current.parentElement;
        }
        return null;
    }

    private slugify(value: string): string {
        return value
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^\w\u4e00-\u9fa5-]/g, '')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }

    private resolveInitialTocCollapsed(): boolean {
        if (this.tocCollapsedByDefault) {
            return true;
        }
        return this.tocVariant === 'floating' && this.isCompactViewport();
    }

    private isCompactViewport(): boolean {
        if (typeof window === 'undefined') {
            return false;
        }
        return window.matchMedia('(max-width: 1024px)').matches;
    }
}
