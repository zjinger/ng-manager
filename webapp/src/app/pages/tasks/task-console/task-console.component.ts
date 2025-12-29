import { Component, Input, OnDestroy, OnInit, ViewChild, ElementRef } from "@angular/core";
import { Subscription } from "rxjs";
import { TaskStreamService, TaskConsoleLine, TaskRuntimeStatus } from "../services/task-stream.service";
import { FormsModule } from "@angular/forms";

@Component({
  standalone: true,
  providers: [FormsModule],
  selector: "ngm-task-console",
  templateUrl: "./task-console.component.html",
  styleUrls: ["./task-console.component.less"],
})
export class TaskConsoleComponent implements OnInit, OnDestroy {
  @Input() taskId: string = "";
  @Input() tail: number = 200;

  lines: TaskConsoleLine[] = [];
  status: TaskRuntimeStatus = { status: "idle" };

  follow = true;

  @ViewChild("viewport") viewport?: ElementRef<HTMLDivElement>;

  private sub = new Subscription();

  constructor(private stream: TaskStreamService) { }

  ngOnInit() {
    if (!this.taskId) return;

    this.stream.ensureConnected();
    this.stream.subscribeTask(this.taskId, this.tail);

    this.sub.add(
      this.stream.lines$(this.taskId).subscribe((lines) => {
        this.lines = lines;
        if (this.follow) queueMicrotask(() => this.scrollToBottom());
      })
    );

    this.sub.add(this.stream.status$(this.taskId).subscribe((s) => (this.status = s)));
  }

  ngOnDestroy() {
    if (this.taskId) this.stream.unsubscribeTask(this.taskId);
    this.sub.unsubscribe();
  }

  toggleFollow() {
    this.follow = !this.follow;
    if (this.follow) this.scrollToBottom();
  }

  clear() {
    this.stream.clear(this.taskId);
  }

  private scrollToBottom() {
    const el = this.viewport?.nativeElement;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }

  trackByIdx(i: number) {
    return i;
  }
}
