import { Component, Input } from '@angular/core';
import { DashboardItem } from '../../dashboard.model';
import { WidgetBaseComponent } from './widget-base.component';
@Component({
  selector: 'app-news-feed-widget',
  imports: [
    WidgetBaseComponent,
  ],
  template: `
    <app-widget-base [item]="item">

    </app-widget-base>
  `,
  styleUrls: [],
})
export class NewsFeedWidgetComponent {
  @Input() item!: DashboardItem;
}
