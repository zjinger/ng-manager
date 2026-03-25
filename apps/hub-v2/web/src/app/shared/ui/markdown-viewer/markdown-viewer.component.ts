import { ChangeDetectionStrategy, Component, ElementRef, Input, ViewChild, inject } from '@angular/core';
import { MarkdownModule } from 'ngx-markdown';
import { CommonModule } from '@angular/common';
import { NzImageService } from 'ng-zorro-antd/image';

@Component({
    selector: 'app-markdown-viewer',
    standalone: true,
    imports: [CommonModule, MarkdownModule],
    templateUrl: './markdown-viewer.component.html',
    styleUrls: ['./markdown-viewer.component.less'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MarkdownViewerComponent {
    private readonly imageService = inject(NzImageService);

    @ViewChild('viewerRef', { static: true })
    viewerRef!: ElementRef<HTMLElement>;

    @Input() content = '';

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
}
