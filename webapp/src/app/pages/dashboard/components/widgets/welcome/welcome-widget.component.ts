import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DashboardItem } from '../../../dashboard.model';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { CommonModule } from '@angular/common';
import { WidgetBaseComponent } from '../widget-base.component';
@Component({
  selector: 'app-welcome-widget',
  imports: [
    CommonModule,
    NzIconModule,
    NzButtonModule,
    WidgetBaseComponent,
  ],
  template: `
    <app-widget-base [item]="item">
        <div class="logo">
          <nz-icon nzType="proj:angular" nzTheme="outline" />
        </div>
          <h2>欢迎来到新项目！</h2>
          <div class="item">
            <div class="icon-wrapper">
              <nz-icon nzType="dashboard" nzTheme="outline" />
            </div>
            <p>这里是项目仪表盘，你可以点击右上方的“自定义”按钮来添加部件。你的改动将会自动保存。</p>
          </div>
          <div class="item">
            <div class="icon-wrapper">
              <nz-icon nzType="arrow-left" nzTheme="outline" />
            </div>
            <p>左侧是各个管理页面。在「插件」页面可以添加新的 Vue CLI 插件，「依赖」页面用于管理项目的依赖包，「配置」页面用于配置各种工具，「任务」页面用于运行各个脚本（比如 webpack 打包）。</p>
          </div>
          <div class="item">
            <div class="icon-wrapper">
              <nz-icon nzType="home" nzTheme="outline" />
            </div>
            <p>点击左上方的下拉菜单或状态栏上的小房子按钮来返回到项目管理器。</p>
          </div>
        <div class="footer">
          <button nz-button nzType="primary" routerLink="/projects" nzSize="large" (click)="removeWidget.emit()">
            <nz-icon nzType="check" nzTheme="outline" />
            <span> 了解 </span>
          </button>
        </div>
    </app-widget-base>
  `,
  styleUrls: ['./welcome-widget.component.less'],
})
export class WelcomeWidgetComponent {
  @Input() item!: DashboardItem;

  @Output() removeWidget = new EventEmitter<void>();
}
