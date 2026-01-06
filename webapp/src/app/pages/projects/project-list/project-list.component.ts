import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { ProjectItem } from './project-item.component';
import { ProjectStateService } from '../services/project.state.service';
import { NzEmptyModule } from 'ng-zorro-antd/empty';

@Component({
  selector: 'app-project-list',
  imports: [CommonModule, NzCardModule, NzGridModule, ProjectItem, NzEmptyModule],
  template: `
  <div nz-row class="page">
    <div nz-col nzSpan="16" nzOffset="4" class="col">
      @if(projectState.favoriteProjects().length > 0){
        <div class="header">
          <h2>收藏的项目</h2>
        </div>
        <ng-container *ngTemplateOutlet="itemsTpl; context: { $implicit: projectState.favoriteProjects()}"></ng-container>
      }
      @if(projectState.favoriteProjects().length > 0){
        <div class="header">
          <h2>更多项目</h2>
        </div>
      }
      <ng-container *ngTemplateOutlet="itemsTpl; context: { $implicit: projectState.moreProjects()}"></ng-container>
      <!-- No projects -->
      @if(projectState.projects().length === 0){
        <div class="no-projects">
          <nz-empty nzNotFoundImage="simple" nzNotFoundContent="暂无项目，快去创建或导入第一个项目吧！"></nz-empty>
        </div>
      }
      <!-- Template for project items -->
      <ng-template #itemsTpl let-projects>
        <div class="content">
          @for (project of projects; track project.id) {
            <app-project-item 
              (toggleFavorite)="projectState.toggleFavorite(project.id)" 
              (openInEditor)="projectState.openCurrentInEditor()"
              [project]="project"  
              [open]="project.id === projectState.currentProject()?.id">
            </app-project-item>
          }
        </div>
      </ng-template>
    </div>
  </div>`,
  styles: [`
  :host{
    display: block;
    height: 100%;
    overflow:hidden;
  }
    .page {
      height:100%;
      overflow-y: auto;
      .col{
        display: flex;
        flex-direction: column;
      }
    }
    .header {
      padding: 12px 0;
      h2{
        margin: 0;
        font-weight: 600;
      }
    }  
  `],
})
export class ProjectListComponent implements OnInit {

  constructor(public projectState: ProjectStateService) {
  }

  ngOnInit() {
    this.projectState.getProjects();
  }
}
