import { Component } from '@angular/core';
import { NzEmptyModule } from 'ng-zorro-antd/empty';

@Component({
  selector: 'app-skills-hub-settings',
  standalone: true,
  imports: [NzEmptyModule],
  template: `
    <nz-empty
      nzNotFoundImage="simple"
      [nzNotFoundContent]="'Skills Hub 页面正在开发中，敬请期待。'"
    ></nz-empty>
  `,
  styles: [
    `
      :host {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 400px;
        color: grey;
      }
    `,
  ],
})
export class SkillsHubSettingsComponent {}
