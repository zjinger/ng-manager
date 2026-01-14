import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';
import { Component, DestroyRef, inject, Input, OnDestroy, ViewChild } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormsModule } from "@angular/forms";
import { UiNotifierService } from "@app/core";
import { TaskRuntimeStatus } from "@models/task.model";
import { TerminalViewComponent } from "@shared/index";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzSpaceModule } from "ng-zorro-antd/space";
import { NzTooltipModule } from "ng-zorro-antd/tooltip";
import { debounceTime, distinctUntilChanged, Subject, Subscription } from "rxjs";
import { TaskStreamService } from "../services/task-stream.service";
@Component({
  selector: "app-task-console",
  standalone: true,
  imports: [
    FormsModule,
    NzButtonModule,
    NzSpaceModule,
    NzIconModule,
    NzTooltipModule,
    TerminalViewComponent,
    ClipboardModule
  ],
  templateUrl: "./task-console.component.html",
  styleUrls: ["./task-console.component.less"],
})
export class TaskConsoleComponent implements OnDestroy {
  private _taskId = "";
  private destroyRef = inject(DestroyRef);
  @Input()
  set taskId(id: string) {
    const next = (id ?? "").trim();
    if (!next) {
      // queueMicrotask(() => this.term?.reset());
      return;
    };
    if (next === this._taskId) return;
    // 切换 run：先退订旧 run（并清 UI）
    if (this._taskId) {
      this.stream.unsubscribeTask(this._taskId);
      this.term?.clear();
    }

    this._taskId = next;
    this.bind(next);
  }
  get taskId() {
    return this._taskId;
  }

  @Input() tail = 200;

  follow = true;
  status: TaskRuntimeStatus = { status: "idle" };

  @ViewChild(TerminalViewComponent) term?: TerminalViewComponent;

  private sub = new Subscription();
  private resizeSub = new Subscription();
  /** WS resize：只在这一层做“协议级收敛” */
  private resize$ = new Subject<{ cols: number; rows: number }>();
  constructor(
    private stream: TaskStreamService,
    private clipboard: Clipboard,
    private notify: UiNotifierService
  ) {
    this.resizeSub.add(
      this.resize$
        .pipe(debounceTime(350),
          distinctUntilChanged((a, b) => a.cols === b.cols && a.rows === b.rows),
          takeUntilDestroyed(this.destroyRef))
        .subscribe((size) => {
          if (this._taskId) {
            this.stream.resize(this._taskId, size.cols, size.rows);
          }
        })
    );
  }
  private bind(taskId: string) {
    // 订阅 run 输出
    this.stream.subscribeTask(taskId, this.tail);

    // 重绑 rx 订阅
    this.sub.unsubscribe();
    this.sub = new Subscription();
    // 输出：每个 chunk 直接写 xterm
    this.sub.add(
      this.stream.output$(taskId).subscribe((m) => {
        if (!this.term) return;
        // 如果想对 stderr 做更明显的颜色：可以在写入前加 ANSI SGR
        // 这里不强行染色，尊重原始 ANSI（如果有）
        // 仅在无 ANSI 且 stderr 时加一个轻微红色，可以后续再做
        this.term.follow = this.follow;
        this.term.write(m.payload.text);
      })
    );
    // 状态
    this.sub.add(this.stream.status$(taskId).subscribe((s) => (this.status = s)));
  }

  ngOnDestroy() {
    if (this._taskId) this.stream.unsubscribeTask(this._taskId);
    this.sub.unsubscribe();
    this.resizeSub.unsubscribe();
  }

  toggleFollow() {
    this.follow = !this.follow;
    if (this.follow) this.term?.scrollToBottom();
  }

  clear() {
    this.term?.clear();
  }

  toBottom() {
    this.term?.scrollToBottom();
  }

  async copy() {
    const text = this.term?.copyAll() ?? "";
    if (!text) return;
    const ok = this.clipboard.copy(text);
    if (ok) {
      this.notify.success("Console output copied to clipboard.");
    } else {
      this.notify.error("Failed to copy console output.");
    }
  }

  onTermResized(size: { cols: number; rows: number }) {
    // 使用rxjs 节流发送到后端
    this.resize$.next(size);
  }
}
