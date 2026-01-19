import { Component, Input } from '@angular/core';
import { DashboardItem } from '../../dashboard.model';
import { WidgetBaseComponent } from './widget-base.component';
@Component({
  selector: 'app-quick-task-widget',
  imports: [
    WidgetBaseComponent,
  ],
  template: `
    <app-widget-base [item]="item">
      
    </app-widget-base>
  `,
  styleUrls: [`./widget-base.less`],
})
export class QuickTaskWidgetComponent {
  @Input() item!: DashboardItem;
}
