import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { DashboardItem } from '@pages/dashboard/dashboard.model';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';

@Component({
  selector: 'app-widget-base',
  imports: [CommonModule, NzButtonModule, NzIconModule],
  template: `
    <div class="widget">
      <div class="header">
        <div class="title">{{ item.title }}</div>
          @if(item.configurable){
          <div class="actions">
            <ng-content select="actions"></ng-content>
          </div>
          }
      </div>
      <div class="content">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: `
    :host {
        display: block;
        height: 100%;
    }

    .widget {
        height: 100%;
        padding: 12px 16px;
        display: flex;
        flex-direction: column;
    }
    .header {
        flex : 0 0 auto;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }
    .title {
        font-size: 18px;
        font-weight: 600;
        flex: 1 1 auto;
        opacity: 0.5;
    }

    .actions {
        flex: 0 0 auto;
    }

    .content {
        flex: 1 1 auto;
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 0;
        overflow: hidden; 
    }
  `,
})
export class WidgetBaseComponent {
  @Input() item!: DashboardItem;
}
