import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { PageLayoutComponent } from '@app/shared';
import { NzIconModule } from 'ng-zorro-antd/icon';

@Component({
  selector: 'app-setting.component',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, PageLayoutComponent, NzIconModule],
  styleUrl: './setting.component.less',
  template: `
    <app-page-layout [title]="'设置'">
      <div class="settings-workbench">
        <div class="panel">
          <nav class="settings-sidebar">
            <a class="settings-nav-item" routerLink="/settings/ai-agent" routerLinkActive="active">
              <nz-icon nzType="robot" />
              AI Agent / MCP
            </a>
            <a class="settings-nav-item" routerLink="/settings/skills-hub" routerLinkActive="active">
              <nz-icon nzType="appstore" />
              Skills Hub
            </a>
          </nav>
          <div class="settings-content">
            <router-outlet></router-outlet>
          </div>
        </div>
      </div>
    </app-page-layout>
  `
})
export class SettingComponent {

}
