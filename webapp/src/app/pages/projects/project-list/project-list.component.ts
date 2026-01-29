import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { ProjectStateService } from '../services/project.state.service';
import { ProjectItem } from './project-item.component';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { FormsModule } from '@angular/forms';
@Component({
  selector: 'app-project-list',
  imports: [CommonModule, FormsModule, NzCardModule, NzGridModule, ProjectItem, NzEmptyModule, NzInputModule, NzIconModule],
  template: `
  <div nz-row class="page">
    <div nz-col nzSpan="16" nzOffset="4" class="col">
      <div nz-col class="topbar">
        <nz-input-wrapper>
          <nz-icon class="search-icon" nzInputPrefix nzType="search" />
          <input
            nz-input
            placeholder="搜索项目"
            [ngModel]="projectState.keyword()"
            (ngModelChange)="projectState.keyword.set($event)"
          />
        </nz-input-wrapper>
      </div>
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
      .topbar{
        width: 100%;
        display: flex;
        justify-content: center;
        margin-bottom: 12px;
        nz-input-wrapper{
          width:25%;
          min-width:200px;
        }
      }
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
