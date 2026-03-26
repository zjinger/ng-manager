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
    private headingObserver: IntersectionObserver | null = null;

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['content'] || changes['showToc'] || changes['tocCollapsedByDefault'] || changes['tocVariant']) {
            queueMicrotask(() => this.buildToc());
        }
    }

    onMarkdownReady(): void {
        this.buildToc();
    }

    ngOnDestroy(): void {
        this.destroyHeadingObserver();
    }

    jumpToHeading(id: string): void {
        const host = this.viewerRef?.nativeElement;
        const target = host?.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
        this.activeTocId = id;
        this.cdr.markForCheck();
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
            this.destroyHeadingObserver();
            this.cdr.markForCheck();
            return;
        }

        const host = this.viewerRef?.nativeElement;
        if (!host) {
            this.tocItems = [];
            this.activeTocId = null;
            this.tocCollapsed = this.tocCollapsedByDefault;
            this.destroyHeadingObserver();
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
        this.tocCollapsed = this.tocCollapsedByDefault;
        this.setupHeadingObserver(host, headings);
        this.cdr.markForCheck();
    }

    private setupHeadingObserver(host: HTMLElement, headings: HTMLElement[]): void {
        this.destroyHeadingObserver();
        if (headings.length === 0) {
            return;
        }

        const root = this.findScrollContainer(host);
        this.headingObserver = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort((a, b) => Math.abs(a.boundingClientRect.top - 120) - Math.abs(b.boundingClientRect.top - 120));
                if (visible.length === 0) {
                    return;
                }
                const currentId = (visible[0].target as HTMLElement).id;
                if (!currentId || currentId === this.activeTocId) {
                    return;
                }
                this.activeTocId = currentId;
                this.cdr.markForCheck();
            },
            {
                root,
                rootMargin: '-88px 0px -60% 0px',
                threshold: [0, 1],
            }
        );

        for (const heading of headings) {
            this.headingObserver.observe(heading);
        }
    }

    private destroyHeadingObserver(): void {
        this.headingObserver?.disconnect();
        this.headingObserver = null;
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
}
