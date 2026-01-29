import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
@Component({
  selector: 'ngm-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NzLayoutModule, NzIconModule],
  template: `
      <nz-header class="app-header">
        <nz-icon nzType="disconnect" nzTheme="outline" />
        <span>连接已断开</span>
      </nz-header>
  `,
  styles: [
    `
      nz-header.app-header {
        padding: 0;
        width: 100%;
        position: relative;
        height: 48px;
        line-height: 48px;
        background: var(--header-error-background);
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        gap: 8px;
      }
    `,
  ],
})
export class LayoutHeaderComponent {

}
