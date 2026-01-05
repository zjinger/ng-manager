import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { ProjectItem } from './project-item.component';
import { Project } from '@models/project.model';
import { ProjectStateService } from '../services/project-state.service';
import { NzEmptyModule } from 'ng-zorro-antd/empty';

@Component({
  selector: 'app-project-list',
  imports: [CommonModule, NzCardModule, NzGridModule, ProjectItem, NzEmptyModule],
  template: `
  <div nz-row class="page">
    @if(favoriteProjects.length > 0){
    <div nz-col nzSpan="16" nzOffset="4">
      <div class="header">
        <h2>收藏的项目</h2>
      </div>
      <div class="content">
         @for(project of favoriteProjects;track project.id){
          <app-project-item [project]="project" [open]="project.id === curProject?.id"></app-project-item>
        }
      </div> 
    </div>
    }
    <div nz-col nzSpan="16" nzOffset="4">
      @if(favoriteProjects.length > 0){
        <div class="header">
          <h2>更多项目</h2>
        </div>
      }
      <div class="content">
        @for(project of moreProjects;track project.id){
          <app-project-item [project]="project" [open]="project.id === curProject?.id"></app-project-item>
        }
      </div>
      @if(projects.length === 0){
        <div class="no-projects">
          <nz-empty nzNotFoundImage="simple" nzNotFoundContent="暂无项目，快去创建或导入第一个项目吧！"></nz-empty>
        </div>
      }
    </div>
  </div>`,
  styles: [`
    .page {
      margin-top: 24px;
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

  projects: Project[] = [];

  favoriteProjects: Project[] = [];
  moreProjects: Project[] = [];

  curProject: Project | null = null;

  constructor(private projectStateService: ProjectStateService) {
    this.projects = this.projectStateService.projects;
    this.favoriteProjects = this.projectStateService.getFavoriteProjects();
    this.moreProjects = this.projectStateService.getMoreProjects();
    this.curProject = this.projectStateService.currentProject;
  }

  ngOnInit() {
    this.projectStateService.getProjects();
  }
}
