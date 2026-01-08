import { Component, Input, OnDestroy, ViewChild, ElementRef } from "@angular/core";
import { Subscription } from "rxjs";
import { TaskStreamService } from "../services/task-stream.service";
import { FormsModule } from "@angular/forms";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzSpaceModule } from "ng-zorro-antd/space";
import { NzTooltipModule } from "ng-zorro-antd/tooltip";
import { TaskConsoleLine, TaskRuntimeStatus } from "@models/task.model";

@Component({
  selector: "app-task-console",
  standalone: true,
  imports: [FormsModule, NzButtonModule, NzSpaceModule, NzIconModule, NzTooltipModule],
  templateUrl: "./task-console.component.html",
  styleUrls: ["./task-console.component.less"],
})
export class TaskConsoleComponent implements OnDestroy {
  private _taskId = "";
  @Input()
  set taskId(id: string) {
    const next = (id ?? "").trim();
    if (!next) return;                 // 初始为空：不做任何事
    if (next === this._taskId) return; // 相同：不重复订阅
    // 切换任务：先退订旧的
    if (this._taskId) {
      this.stream.clear(this._taskId); // 清掉旧数据
      this.stream.unsubscribeTask(this._taskId); // 退订旧任务
    }

    this._taskId = next;
    this.bindToTask(next);
  }
  get taskId() {
    return this._taskId;
  }

  @Input() tail: number = 200;

  // --- view state ---
  lines: TaskConsoleLine[] = [];
  status: TaskRuntimeStatus = { status: "idle" };
  follow = true;

  @ViewChild("viewport") viewport?: ElementRef<HTMLDivElement>;

  private sub = new Subscription();

  constructor(private stream: TaskStreamService) { }

  private bindToTask(taskId: string) {
    // 确保 ws 已连接（内部幂等）
    this.stream.ensureConnected();

    // 发送订阅
    this.stream.subscribeTask(taskId, this.tail);

    // 清掉旧订阅，避免串台
    this.sub.unsubscribe();
    this.sub = new Subscription();

    // 绑定新的 task 流
    this.sub.add(
      this.stream.lines$(taskId).subscribe((lines) => {
        this.lines = lines;
        if (this.follow) queueMicrotask(() => this.scrollToBottom());
      })
    );

    this.sub.add(this.stream.status$(taskId).subscribe((s) => (this.status = s)));
  }

  ngOnDestroy() {
    // 组件销毁：退订当前 task + rx 订阅
    if (this._taskId) this.stream.unsubscribeTask(this._taskId);
    this.sub.unsubscribe();
  }

  /**
   * 切换是否跟随底部
   */
  toggleFollow() {
    this.follow = !this.follow;
    if (this.follow) this.scrollToBottom();
  }

  clear() {
    if (!this._taskId) return;
    this.stream.clear(this._taskId);
  }

  toBottom() {
    this.scrollToBottom();
  }

  // TODO: 复制全部
  copy() {

  }

  private scrollToBottom() {
    const el = this.viewport?.nativeElement;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }

}
