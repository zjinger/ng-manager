import { Component, inject, Input } from '@angular/core';
import { ClipboardModule, Clipboard } from '@angular/cdk/clipboard';

import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-curl-actions',
  imports: [CommonModule, ClipboardModule],
  template: `
     <div class="wrap">
      <button nz-button nzSize="small" nzType="default" [disabled]="!curl?.bash" (click)="copy(curl!.bash)">
        Copy curl (bash)
      </button>

      <button nz-button nzSize="small" nzType="default" [disabled]="!curl?.powershell" (click)="copy(curl!.powershell)">
        Copy curl (ps)
      </button>
    </div>
  `,
  styles: ``,
})
export class CurlActionsComponent {
  private clipboard = inject(Clipboard);
  @Input() curl: { bash: string; powershell: string } | null = null;

  copy(text: string) {
    this.clipboard.copy(text);
  }
}
