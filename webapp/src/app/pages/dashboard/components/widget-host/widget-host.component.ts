import { Component, EventEmitter, Input, Output } from '@angular/core';
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
        @case ('welcome') { <app-welcome-widget [item]="item" (removeWidget)="remove.emit(item)"></app-welcome-widget> }
        @case ('quickTasks') { <app-quick-task-widget [item]="item"></app-quick-task-widget> }
        @case ('killPort') { <app-kill-port-widget [item]="item"></app-kill-port-widget> }
        @case ('newsFeed') { <app-news-feed-widget [item]="item"></app-news-feed-widget> }
      }
    }
  `,
  styles: [
    `
    :host { display:block; width:100%; height:100%; }
    .widget-shell { width:100%; height:100%; }
    .widget-shell[data-fit="scroll"] { overflow: auto; }
    .widget-shell[data-fit="responsive"] { overflow: hidden; }
    .widget-shell[data-fit="scale"] { overflow: hidden; }
    .widget-scale { width:100%; height:100%; }
    `
  ],
})
export class WidgetHostComponent {
  @Input() item: DashboardItem | undefined;
  @Input() editMode = false;

  @Output() remove = new EventEmitter<DashboardItem>();
}
