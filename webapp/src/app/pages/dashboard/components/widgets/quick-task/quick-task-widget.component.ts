import { CommonModule } from '@angular/common';
import { Component, computed, inject, Input, signal } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { DashboardItem, QuickTaskWidgetConfig } from '../../../dashboard.model';
import { WidgetBaseComponent } from '../widget-base.component';
import { TaskStateService } from '@pages/tasks/services/tasks.state.service';
import { TaskRow } from '@models/task.model';
import { FormsModule } from '@angular/forms';
@Component({
  selector: 'app-quick-task-widget',
  imports: [
    CommonModule,
    FormsModule,
    WidgetBaseComponent,
    NzButtonModule,
    NzIconModule,
    NzModalModule,
    NzSelectModule
  ],
  template: `
    <app-widget-base [item]="item">
        <ng-container ngProjectAs="actions">
          <button nz-button nzType="link" nzSize="small" (click)="openConfig()">
            <nz-icon nzType="setting" nzTheme="outline"/>
          </button>
        </ng-container>
        @if(item.configurable && !item.config){
        <div class="no-config">
          <nz-icon nzType="setting" nzTheme="fill" />
          <button nz-button (click)="openConfig()" nzType="primary">配置部件</button>
        </div>
        }
    </app-widget-base>
    <nz-modal
      nzCentered
      [(nzVisible)]="isModalVisible"
      nzTitle="配置部件"
      (nzOnCancel)="isModalVisible = false"
      [nzMaskClosable]="false"
    >
      <ng-container *nzModalContent>
        <div class="modal-body">
          <label>选择一项任务</label>
          <nz-select 
            nzPlaceHolder="请选择任务"
            [(ngModel)]="selectedTaskId"
            [nzLoading]="loading()"
            [nzDisabled]="loading()"
            style="width: 100%;"
          >
           @for (opt of taskOptions(); track opt.value) {
              <nz-option [nzLabel]="opt.label" [nzValue]="opt.value"></nz-option>
            }
          </nz-select>
        </div>
      </ng-container>

      <ng-container *nzModalFooter>
        <button
          nz-button
          nzType="primary"
          (click)="save()"
          [disabled]="!selectedTaskId"
        >
          保存
        </button>
      </ng-container>
    </nz-modal>    
  `,
  styles: [`
    .no-config {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 20px;
      width: 100%;
      nz-icon {
        font-size: 48px;
        color: var(--app-gray);
      }
    }
    .modal-body{
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      label{
        flex:0 0 auto;
        margin-right: 16px;
        display: inline-block;
        width: 120px;
      }
      nz-select{
        flex: 1;
        margin-left: 16px;
      }
    }
  `],
})
export class QuickTaskWidgetComponent {
  @Input() item!: DashboardItem;

  private taskState = inject(TaskStateService);

  isModalVisible = false;

  readonly loading = signal(false);

  selectedTaskId = '';

  /** 当前项目任务 rows */
  readonly rowsOfProject = computed<TaskRow[]>(() => {
    const pid = this.item.projectId;
    if (!pid) return [];
    return this.taskState.rowsViewOf(pid)();
  });

  readonly taskOptions = computed(() => {
    const rows = this.rowsOfProject();
    return rows
      .map(r => ({
        value: r.spec.id,
        label: r.spec.name ?? r.spec.id
      }));
  });

  async openConfig() {
    const pid = this.item.projectId;
    if (!pid) {
      this.isModalVisible = true;
      return;
    }

    // 回填已有配置
    const cfg = this.item?.config as QuickTaskWidgetConfig | undefined;
    this.selectedTaskId = cfg?.taskId ?? '';

    this.isModalVisible = true;

    // 确保任务已加载
    this.loading.set(true);
    try {
      await this.taskState.ensureProjectLoaded(pid);
    } finally {
      this.loading.set(false);
    }
  }


  save() {
    const pid = this.item.projectId;
    const taskId = (this.selectedTaskId ?? '').trim();
    if (!pid || !taskId) return;

    const next: QuickTaskWidgetConfig = { taskId };

    // 1) 写回 widget 配置（你们 Dashboard 如果是 immutable，就别直接改对象）
    this.item.config = next;

    // 2) 通知 Dashboard 持久化（这里接你们已有的 dashboard-state / dashboard-service）
    //    例如：this.dashboardState.updateItemConfig(this.item.id, next);

    this.isModalVisible = false;

  }
}
