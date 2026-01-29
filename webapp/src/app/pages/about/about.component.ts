import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { PageLayoutComponent } from '@app/shared';
import { NzGridModule } from 'ng-zorro-antd/grid';

@Component({
  selector: 'app-about.component',
  imports: [CommonModule, NzGridModule, PageLayoutComponent],
  template: `
    <page-layout [title]="'关于'" >
        <div class="header">
          <h2>关于 Ng-Manager</h2>
        </div>
        <div class="content">
          <p>Ng-Manager 是一个开源的 Angular 项目管理工具，旨在帮助开发者更高效地管理和组织他们的 Angular/Vue 项目。</p>
          <p>它提供了一个直观的界面，允许用户轻松创建、导入和管理多个 Angular/Vue 项目，同时集成了常用的开发工具和功能。</p>
          <div>
            <p>主要功能包括：</p>
            <ul>
              <li>项目创建与导入</li>
              <li>项目仪表盘自定义</li>
              <li>依赖管理</li>
              <li>项目任务管理</li>
              <li>多项目支持</li>
              <li>集成常用开发工具</li>
            </ul>
          </div>
          <p>版本：1.0.0</p>
          <p>官方网站：<a href="https://ng-manager.example.com" target="_blank">https://ng-manager.example.com</a></p>
        </div>
    </page-layout>
  `,
})
export class AboutComponent {

}
