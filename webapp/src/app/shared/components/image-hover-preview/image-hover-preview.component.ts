import { Component, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface HoverPreviewState {
  src: string;
  alt: string;
  left: number;
  top: number;
}

@Component({
  selector: 'app-image-hover-preview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- 加载出错就不显示 -->
    <div
      class="item-img"
      [style.display]="!src() || hasError() ? 'none' : 'block'"
      [ngStyle]="{ width: width(), height: height() }"
    >
      <img
        [src]="src()"
        [alt]="alt()"
        (error)="markError()"
        (mouseenter)="showPreview($event)"
        (mousemove)="movePreview($event)"
        (mouseleave)="hidePreview()"
        (error)="markError()"
      />
    </div>

    @if (hoveredPreview()) {
      <div
        class="preview-float"
        [style.left.px]="hoveredPreview()!.left"
        [style.top.px]="hoveredPreview()!.top"
      >
        <img [src]="hoveredPreview()!.src" [alt]="hoveredPreview()!.alt" />
      </div>
    }
  `,
  styles: `
    .item-img {
      flex-shrink: 0;
      margin-left: auto;
      // width: 60px;
      // height: 60px;
      overflow: hidden;
      border-radius: 8px;
      border: 1px solid #f0f0f0;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center;
      }
    }

    .preview-float {
      padding: 6px;
      position: fixed;
      z-index: 1000;
      pointer-events: none;

      width: 320px;
      height: 200px;

      display: flex;
      align-items: center;
      justify-content: center;

      background: #fff;
      border-radius: 6px;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);

      img {
        width: 100%;
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      }
    }
  `,
})
export class ImageHoverPreviewComponent {
  readonly width = input(`60px`);
  readonly height = input(`60px`);
  // 主图
  readonly src = input<string | null>(null);
  readonly alt = input<string>('');

  // hover 预览图
  readonly previewSrc = input<string | null>(null);
  readonly previewAlt = input<string>('');

  // 图片加载失败标记
  readonly hasError = signal(false);

  // hover 状态
  readonly hoveredPreview = signal<HoverPreviewState | null>(null);

  showPreview(e: MouseEvent) {
    if (!this.previewSrc() || this.hasError()) {
      this.hoveredPreview.set(null);
      return;
    }

    const pos = this.calcPosition(e);

    this.hoveredPreview.set({
      src: this.previewSrc()!,
      alt: this.previewAlt() || this.alt(),
      ...pos,
    });
  }

  movePreview(e: MouseEvent) {
    if (!this.hoveredPreview()) return;
    this.showPreview(e);
  }

  hidePreview() {
    this.hoveredPreview.set(null);
  }

  markError() {
    this.hasError.set(true);
    this.hoveredPreview.set(null);
  }

  private calcPosition(e: MouseEvent) {
    const gap = 16;
    const width = 320;
    const height = 200;

    let left = e.clientX + gap;
    let top = e.clientY + gap;

    if (left + width > window.innerWidth) {
      left = e.clientX - width - gap;
    }

    if (top + height > window.innerHeight) {
      top = window.innerHeight - height - 12;
    }

    return { left, top };
  }
}
