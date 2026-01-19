import { Component, Input } from '@angular/core';
import { DashboardItem } from '../../dashboard.model';
import {
  WelcomeWidgetComponent,
  QuickTaskWidgetComponent,
  KillPortWidgetComponent,
  NewsFeedWidgetComponent
} from "../widgets";
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-widget-host',
  imports: [
    CommonModule,
    WelcomeWidgetComponent,
    QuickTaskWidgetComponent,
    KillPortWidgetComponent,
    NewsFeedWidgetComponent
  ],
  template: `

  @if(item){
    @switch (item.key) {
      @case ('welcome'){
        <app-welcome-widget [item]="item" ></app-welcome-widget>
      }
      @case ('quickTasks'){
        <app-quick-task-widget [item]="item" ></app-quick-task-widget>
      }
      @case ('killPort'){
        <app-kill-port-widget [item]="item" ></app-kill-port-widget>
      }
      @case ('newsFeed'){
        <app-news-feed-widget [item]="item" ></app-news-feed-widget>
      }
    }
  }
  `,
  styles: ``,
})
export class WidgetHostComponent {
  @Input() item: DashboardItem | undefined;
  @Input() editMode = false;
}
