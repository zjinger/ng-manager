import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { ProjectListComponent } from "./project-list/project-list.component";
import { ProjectCreateComponent } from "./project-create/project-create.component";
import { ProjectImportComponent } from "./project-import/project-import.component";

@Component({
  selector: 'app-projects',
  imports: [CommonModule, NzTabsModule, NzIconModule, ProjectListComponent, ProjectCreateComponent, ProjectImportComponent],
  template: `
    <div class="page">
      <div class="header">
        <h2>项目管理</h2>
      </div>
      <nz-tabs nzCentered class="tabs-container">
        <nz-tab [nzTitle]="projectTitleTemplate">
          <ng-template #projectTitleTemplate>
            <nz-icon nzType="unordered-list" nzTheme="outline" />
             项目
          </ng-template>
          <!-- <app-project-list></app-project-list> -->
            <app-project-create></app-project-create>
        </nz-tab>
        <nz-tab [nzTitle]="addTitleTemplate">
          <ng-template #addTitleTemplate>
            <nz-icon nzType="plus-square" nzTheme="outline" />
             创建
          </ng-template>
          <app-project-create></app-project-create>
        </nz-tab>
        <nz-tab [nzTitle]="importTitleTemplate">
          <ng-template #importTitleTemplate>
            <nz-icon nzType="import" nzTheme="outline" />
             导入
          </ng-template>
          <app-project-import></app-project-import>
        </nz-tab>
    </nz-tabs>
    </div>
  `,
  styles: [`
    .page{ display:flex; flex-direction:column; height:100%; }
    .header{
      display:flex;
      align-items:center;
      justify-content:center;
      flex:0 0 auto;
      h2{
        margin:0;
      }
    }
    nz-tabs.tabs-container{
      flex:1 1 auto;
      height:0;
      &::ng-deep .ant-tabs-content{
          height:100%;
          .ant-tabs-tabpane{
            height:100%;
          }
      }
    }
    .toolbar input{ flex:1; }
    .current{ margin:10px 0; opacity:.75; }
  `]
})
export class ProjectsComponent {
}
