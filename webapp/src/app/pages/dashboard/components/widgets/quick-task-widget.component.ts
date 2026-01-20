import { Component, Input } from '@angular/core';
import { DashboardItem } from '../../dashboard.model';
import { WidgetBaseComponent } from './widget-base.component';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-quick-task-widget',
  imports: [
    CommonModule,
    WidgetBaseComponent,
    NzButtonModule,
    NzIconModule,
  ],
  template: `
    <app-widget-base [item]="item">
      <div class="content">
        @if(item.configurable && !item.config){
          <div class="icon-wrapper">
            <nz-icon nzType="setting" nzTheme="fill" />
          </div>
          <div class="actions">
            <button nz-button nzType="primary">配置部件</button>
          </div>
        }
      </div>
    </app-widget-base>
  `,
  styles: [`
    .content {
      display: flex;
      flex-direction: column;
      align-items: center;
      .icon-wrapper {
        margin-top: 8px;
        margin-bottom: 16px;
        nz-icon {
          font-size: 48px;
          color: var(--app-gray);
        }
      }
    }
  `],
})
export class QuickTaskWidgetComponent {
  @Input() item!: DashboardItem;
}
