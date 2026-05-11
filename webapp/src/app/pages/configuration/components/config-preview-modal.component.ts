import { CommonModule } from '@angular/common';
import { Component, inject, Input } from '@angular/core';
import { NZ_MODAL_DATA } from 'ng-zorro-antd/modal';
import { NzTypographyModule } from 'ng-zorro-antd/typography';
import { ConfigPatch } from '../models';

@Component({
  selector: 'app-config-preview-modal',
  standalone: true,
  imports: [CommonModule, NzTypographyModule],
  template: `
    <div class="preview-content">
      @if (before !== undefined || after !== undefined) {
        <div class="preview-section">
          <div class="preview-label">Before</div>
          <pre class="preview-block">{{ formatValue(before) }}</pre>
        </div>
        <div class="preview-section">
          <div class="preview-label">After</div>
          <pre class="preview-block">{{ formatValue(after) }}</pre>
        </div>
      }
      @for (item of patches; track $index) {
        <div class="patch-item">
          <div class="patch-op">{{ item.op }}</div>
          <div class="patch-path">{{ item.path }}</div>
          <pre class="patch-value">{{ formatValue(item.value) }}</pre>
        </div>
      }
    </div>
  `,
  styles: [`
    .preview-content {
      max-height: 60vh;
      overflow: auto;
    }
    .patch-item {
      padding: 8px 0;
      border-bottom: 1px solid #f0f0f0;
    }
    .preview-section {
      margin-bottom: 12px;
      border: 1px solid #f0f0f0;
      border-radius: 4px;
      overflow: hidden;
    }
    .preview-label {
      padding: 8px 10px;
      font-weight: 600;
      background: #fafafa;
      border-bottom: 1px solid #f0f0f0;
    }
    .preview-block {
      margin: 0;
      padding: 10px;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .patch-op {
      font-weight: 600;
    }
    .patch-path {
      opacity: 0.85;
      margin-top: 4px;
    }
    .patch-value {
      margin: 6px 0;
      white-space: pre-wrap;
      word-break: break-word;
    }
  `]
})
export class ConfigPreviewModalComponent {
  @Input() patches: ConfigPatch[] = [];
  @Input() before: unknown;
  @Input() after: unknown;
  private readonly modalData = inject<{
    patches?: ConfigPatch[];
    before?: unknown;
    after?: unknown;
  } | null>(NZ_MODAL_DATA, { optional: true });

  constructor() {
    if (this.modalData?.patches) {
      this.patches = this.modalData.patches;
    }
    if (this.modalData && "before" in this.modalData) {
      this.before = this.modalData.before;
    }
    if (this.modalData && "after" in this.modalData) {
      this.after = this.modalData.after;
    }
  }

  formatValue(v: unknown): string {
    if (typeof v === 'string') {
      return v;
    }
    try {
      return JSON.stringify(v, null, 2);
    } catch {
      return String(v);
    }
  }
}
