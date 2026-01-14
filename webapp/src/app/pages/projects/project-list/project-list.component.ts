import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { ProjectStateService } from '../services/project.state.service';
import { ProjectItem } from './project-item.component';
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
      @if(projectState.projects().length === 0){
        <div class="no-projects">
          <nz-empty nzNotFoundImage="simple" nzNotFoundContent="暂无项目，快去创建或导入第一个项目吧！"></nz-empty>
        </div>
      }     
    </div>
    <ng-template #itemsTpl let-projects>
        <div class="content">
          @for (project of projects; track project.id) {
            <app-project-item 
              [project] ="project"
              (selectProject)="projectState.selectProject(project)"
              (toggleFavorite)="projectState.toggleFavorite(project.id)" 
              (openInEditor)="projectState.openInEditor(project.id)"
              (editProject)="projectState.openEditModal(project)"
              (deleteProject)="projectState.deleteProject(project.id)"
              [project]="project"  
              [open]="projectState.isOpen(project)">
            </app-project-item>
          }
        </div>
    </ng-template>
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
export class ProjectListComponent {

  public projectState: ProjectStateService = inject(ProjectStateService);

}
