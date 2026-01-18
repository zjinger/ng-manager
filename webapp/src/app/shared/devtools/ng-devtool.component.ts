import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzPopoverModule } from 'ng-zorro-antd/popover';

@Component({
  selector: 'app-ng-devtool',
  imports: [
    CommonModule,
    NzButtonModule,
    NzPopoverModule
  ],
  template: `
   <button
    nz-button
    nzType="default"
    nz-popover
    [nzPopoverTrigger]="'click'"
    [nzPopoverOverlayClassName]="'install-dep-popover'"
    [nzPopoverContent]="installTemplate"
    nzPopoverPlacement="bottomRight"
  >
    安装 devtools
  </button>
  <ng-template #installTemplate>
  <div class="install-popover-content">
    <p>
      Angular DevTools is a browser extension that provides debugging and profiling capabilities for
      Angular applications.
    </p>
    <div class="img-wrapper">
      <img src="/devtools.png" alt="" srcset="" />
    </div>
    <div class="actions">
      <button nz-button nzType="default" (click)="openDevtoolsLearnMorePage()">了解更多</button>
      <button nz-button nzType="primary" (click)="openDevtoolsInstallPage()">
        安装 Angular DevTools
      </button>
    </div>
  </div>
</ng-template>
  `,
  styles: `
  button[nz-button] {
    border-radius: 18px;
  }
    .install-popover-content {
    width: 440px;
    padding: 12px;

    .img-wrapper {
        width: 400px;
        margin: 0 auto;
        border-radius: 8px;
        overflow: hidden;

        img {
            width: 100%;
            max-height: auto;
        }
    }

    .actions {
        margin-top: 12px;
        padding: 0 8px;
        display: flex;
        justify-content: flex-end;
        gap: 8px;
    }
}
  `,
})
export class NgDevtoolComponent {
  openDevtoolsLearnMorePage() {
    window.open("https://angular.dev/tools/devtools", "_blank");
  }

  openDevtoolsInstallPage() {
    window.open("https://chromewebstore.google.com/detail/angular-devtools/ienfalfjdbdpebioblfackkekamfmbnh", "_blank");
  }
}
