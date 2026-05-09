import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { NzTypographyModule } from 'ng-zorro-antd/typography';
import { ConfigPatch } from '../models';

@Component({
  selector: 'app-config-preview-modal',
  standalone: true,
  imports: [CommonModule, NzTypographyModule],
  template: `
    <div class="preview-content">
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

  formatValue(v: unknown): string {
    try {
      return JSON.stringify(v, null, 2);
    } catch {
      return String(v);
    }
  }
}
