import { Component } from '@angular/core';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { SystemLogDrawerComponent } from './system-log/system-log.component';

@Component({
  selector: 'ngm-footer',
  imports: [NzLayoutModule, SystemLogDrawerComponent],
  template:`
    <nz-footer>
      <app-system-log></app-system-log>
    </nz-footer>
  `,
  styles:[
    `
      nz-footer {
        padding: 0;
        align-items: center;
        display: flex;
      }
      app-system-log {
        width: 100%;
      }
    `
  ],
})
export class LayoutFooterComponent {

}
