import { CommonModule } from '@angular/common';
import { Component, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProjectStateService } from '@pages/projects/services/project.state.service';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzLayoutComponent, NzLayoutModule } from "ng-zorro-antd/layout";
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpaceModule } from 'ng-zorro-antd/space';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { TaskStateService } from './services/tasks.state.service';
import { TaskActionsComponent } from './task-actions/task-actions.component';
import { TaskConsoleComponent } from './task-console/task-console.component';
import { TaskHeaderComponent } from './task-header/task-header.component';
import { TaskListComponent } from './task-list/task-list.component';
import { TaskLogDrawerComponent } from './task-log/task-log.component';
@Component({
  selector: 'app-tasks',
  imports: [
    CommonModule,
    FormsModule,
    NzSpaceModule,
    NzSelectModule,
    NzButtonModule,
    NzInputModule,
    NzTableModule,
    NzCardModule,
    NzTagModule,
    NzIconModule,
    NzLayoutModule,
    TaskConsoleComponent,
    TaskListComponent,
    TaskActionsComponent,
    TaskHeaderComponent,
    TaskLogDrawerComponent,
    NzLayoutComponent
  ],
  template: `
    <nz-layout class="page">
      <nz-layout class="page-tasks">
        <app-task-list></app-task-list>
        <nz-content class="content">
          <app-task-header
            [name]="selectedTask()?.spec?.name"
            [description]="selectedTask()?.spec?.description"
            [command]="selectedTask()?.spec?.command"
          ></app-task-header>
          <app-task-actions 
            [isStopping]="taskState.isStopping()"
            [isRunning]="taskState.isRunning()" 
            [isStopped]="taskState.isStopped()"
            (toggle)="taskState.toggleTask()"
            >
          </app-task-actions>
          <app-task-console [taskId]="taskState.selectedTaskId()"></app-task-console>
        </nz-content>
      </nz-layout>
      <app-task-log></app-task-log>
    </nz-layout>

  `,
  styles: [
    `
    .page{
      height: 100%;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .page-tasks {
      flex: 1 1 auto;
      flex-direction: row;
      gap: 8px;
      height: 0;
      display: flex;
      overflow: hidden;
      
      app-task-list {
        flex: 0 0 320px;
        width: 320px;
      }
      .content{
        flex: 1 1 auto;
        width: 0;
        display: flex;
        flex-direction: column;
        padding: 16px;
        gap: 16px;
        height: 100%;
        overflow: hidden;
      }
       app-task-header,
        app-task-actions{
          flex:0 0 auto;
        }
        app-task-console {
          flex: 1 1 auto;
          display: block;
          height:0;
        }
    }
    `
  ],
})
export class TasksComponent {
  projectState = inject(ProjectStateService);
  taskState = inject(TaskStateService);

  selectedTask = this.taskState.selectedRow;


  constructor() {
    // currentProjectId 变化时，自动 setProject + refresh
    effect(async () => {
      const pid = this.projectState.currentProjectId();
      if (pid) {
        await this.taskState.setProject(pid);
      }
    });
  }
}
