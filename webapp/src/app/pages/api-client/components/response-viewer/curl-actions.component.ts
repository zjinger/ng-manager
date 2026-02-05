import { Component, inject, Input } from '@angular/core';
import { ClipboardModule, Clipboard } from '@angular/cdk/clipboard';

import { CommonModule } from '@angular/common';
import { NzSpaceModule } from 'ng-zorro-antd/space';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
@Component({
  selector: 'app-curl-actions',
  imports: [CommonModule, ClipboardModule, NzSpaceModule, NzButtonModule, NzIconModule, NzDropDownModule],
  template: `
    <div class="wrap">
      <nz-space >
        <button nz-button [disabled]="!curl" nz-dropdown [nzDropdownMenu]="menu"  nzType="default" nzTrigger="hover" nzPlacement="bottomCenter">
          <nz-icon nzType="copy" nzTheme="outline"/>
           cURL
        </button>
      </nz-space>
      <nz-dropdown-menu #menu="nzDropdownMenu"  >
          <ul nz-menu>
            <li nz-menu-item>
              <button nz-button nzType="text" [disabled]="!curl?.bash" (click)="copy(curl!.bash)">
                 cURL (Bash)
              </button>
            </li>
            <li nz-menu-item>
              <button nz-button nzType="text" [disabled]="!curl?.powershell" (click)="copy(curl!.powershell)">
                 cURL (PS)
              </button>
            </li>
            <li nz-menu-item>
              <button nz-button nzType="text" [disabled]="!curl?.cmd" (click)="copy(curl!.cmd)">
                 cURL (CMD)
              </button>
            </li>
          </ul>
        </nz-dropdown-menu>
    </div>
  `,
  styles: ``,
})
export class CurlActionsComponent {
  private clipboard = inject(Clipboard);
  @Input() curl: { bash: string; powershell: string; cmd: string } | null = null;
  copy(text: string) {
    this.clipboard.copy(text);
  }
}
