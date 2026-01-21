import { CommonModule } from '@angular/common';
import { Component, computed, inject, Input, OnChanges, signal, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TaskRow } from '@models/task.model';
import { DashboardLayoutService } from '@pages/dashboard/services/dashboard-layout.service';
import { TaskStateService } from '@pages/tasks/services/tasks.state.service';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { DashboardItem, QuickTaskWidgetConfig } from '../../../dashboard.model';
import { WidgetBaseComponent } from '../widget-base.component';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { TaskActionsComponent } from '@pages/tasks/task-actions/task-actions.component';
import { Router } from '@angular/router';
@Component({
  selector: 'app-quick-task-widget',
  imports: [
    CommonModule,
    FormsModule,
    WidgetBaseComponent,
    NzButtonModule,
    NzIconModule,
    NzModalModule,
    NzSelectModule,
    NzBadgeModule,
    NzTooltipModule,
    TaskActionsComponent
  ],
  templateUrl: './quick-task-widget.component.html',
  styleUrls: ['./quick-task-widget.component.less'],
})
export class QuickTaskWidgetComponent implements OnChanges {

  @Input() item!: DashboardItem;

  private taskState = inject(TaskStateService);
  private layout = inject(DashboardLayoutService);
  private router = inject(Router);

  isModalVisible = false;

  readonly loading = signal(false);


  curConfig = signal<QuickTaskWidgetConfig | null>(null);

  curRuntime = computed(() => {
    const cfg = this.curConfig();
    if (!cfg) return { status: 'idle' };
    const taskId = cfg.taskId;
    return this.taskState.getRuntime(taskId) || { status: 'idle' };
  });

  readonly isRunning = computed(() => this.curRuntime().status === "running");
  readonly isStopping = computed(() => this.curRuntime().status === "stopping");
  readonly isStopped = computed(() => {
    const st = this.curRuntime().status;
    return st === "idle" || st === "stopped" || st === "failed" || st === "success";
  });

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
        label: r.spec.name ?? r.spec.id,
        description: r.spec.description ?? '',
      }));
  });
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['item']) {
      const cfg = this.item?.config as QuickTaskWidgetConfig | undefined;
      this.curConfig.set(cfg ? { ...cfg } : null);
    }
  }
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
    const taskItem = this.rowsOfProject().find(r => r.spec.id === taskId)
    const taskName = taskItem?.spec.name ?? '';
    const description = taskItem?.spec.description ?? '';
    const next: QuickTaskWidgetConfig = { taskId, taskName, description };
    this.item.config = next;
    this.curConfig.set(next);
    this.layout.updateConfig(pid, this.item.id, next);

    this.isModalVisible = false;

  }
  toggleTask() {
    if (this.curConfig() == null || !this.curConfig()!.taskId) return;
    const taskId = this.curConfig()!.taskId;
    if (this.isRunning()) {
      this.taskState.stopSelected(taskId);
    } else if (this.isStopped()) {
      this.taskState.startSelected(taskId);
    }
    this.goToTask();
  }
  async goToTask() {
    const cfg = this.curConfig();
    if (!cfg) return;
    const taskId = cfg.taskId;
    this.taskState.select(taskId);
    await this.router.navigate(['/tasks']);
  }
}
