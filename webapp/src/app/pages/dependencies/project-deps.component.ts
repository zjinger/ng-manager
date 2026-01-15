import { Component, computed, effect, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { finalize } from "rxjs/operators";

import { NzButtonModule } from "ng-zorro-antd/button";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzMessageService } from "ng-zorro-antd/message";
import { NzTagModule } from "ng-zorro-antd/tag";
import { NzSpinModule } from "ng-zorro-antd/spin";
import { NzDividerModule } from "ng-zorro-antd/divider";
import { NzPopconfirmModule } from "ng-zorro-antd/popconfirm";
import { DepsApiService } from "./deps-api.service";
import { NzTooltipModule } from "ng-zorro-antd/tooltip";
import { DepItem } from "@models/deps.model";
import { NzGridModule } from "ng-zorro-antd/grid";
import { ProjectStateService } from "@pages/projects/services/project.state.service";
@Component({
  selector: 'app-project-deps.component',
  imports: [
    CommonModule,
    FormsModule,
    NzGridModule,
    NzButtonModule,
    NzInputModule,
    NzIconModule,
    NzTooltipModule,
    NzTagModule,
    NzSpinModule,
    NzDividerModule,
    NzPopconfirmModule,
  ],
  templateUrl: './project-deps.component.html',
  styleUrl: './project-deps.component.less',
})
export class ProjectDepsComponent {
  private api = inject(DepsApiService);
  private msg = inject(NzMessageService);

  projectId = computed(() => this.projectState.currentProjectId() || "");

  loading = signal(false);
  keyword = signal("");

  items = signal<DepItem[]>([]);
  meta = signal<{ packageManager: string; registryOnline: boolean } | null>(null);

  installing = signal<Record<string, boolean>>({});
  uninstalling = signal<Record<string, boolean>>({});


  runtimeItems = computed(() =>
    this.filterItems(this.items().filter((x) => x.group === "dependencies"))
  );
  devItems = computed(() =>
    this.filterItems(this.items().filter((x) => x.group === "devDependencies"))
  );

  runningCount = computed(() => this.items().filter((x) => x.hasUpdate).length);
  projectState = inject(ProjectStateService);
  depsState = inject(DepsApiService);

  constructor() {
    effect(async () => {
      this.refresh();
    });
  }

  private filterItems(list: DepItem[]) {
    const k = this.keyword().trim().toLowerCase();
    if (!k) return list;
    return list.filter((x) => x.name.toLowerCase().includes(k));
  }

  refresh() {
    this.loading.set(true);
    this.api
      .getDeps(this.projectId())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ items, meta }) => {
          this.items.set(items);
          this.meta.set(meta);
        },
        error: (e) => this.msg.error(e?.message || "加载依赖失败"),
      });
  }

  openDetail(item: DepItem) {
    // 你可以直接跳 npm 页面（若允许），或打开一个 Drawer 弹层展示更多信息
    if (item.homepage) window.open(item.homepage, "_blank");
    else window.open(`https://www.npmjs.com/package/${encodeURIComponent(item.name)}`, "_blank");
  }

  installOrUpdate(item: DepItem) {
    const key = item.name;
    this.installing.set({ ...this.installing(), [key]: true });

    const target = item.installed && item.hasUpdate ? "latest" : "required";
    const successMsg = item.installed && item.hasUpdate ? "已更新" : "已安装";
    this.api
      .install(this.projectId(), { name: item.name, group: item.group, target })
      .pipe(
        finalize(() => this.installing.set({ ...this.installing(), [key]: false }))
      )
      .subscribe({
        next: () => {
          this.msg.success(successMsg);
          this.refresh();
        }
      });
  }

  uninstall(item: DepItem) {
    const key = item.name;
    this.uninstalling.set({ ...this.uninstalling(), [key]: true });

    this.api
      .uninstall(this.projectId(), { name: item.name, group: item.group })
      .pipe(finalize(() => this.uninstalling.set({ ...this.uninstalling(), [key]: false })))
      .subscribe({
        next: () => {
          this.msg.success("已卸载");
          this.refresh();
        },
      });
  }

  installDevtools() {
    this.loading.set(true);
    this.api
      .installDevtools(this.projectId())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.msg.success("devtools 已安装");
          this.refresh();
        },
        error: (e) => this.msg.error(e?.message || "devtools 安装失败"),
      });
  }

  installAll(): void {
    // 先“最小可用”的：把未安装的逐个 install（可后续优化为后端批量）
    const todo = this.items().filter((x) => !x.installed);
    if (!todo.length) {
      this.msg.info("没有需要安装的依赖");
      return;
    }

    // 简单串行：避免同时跑多个包管理器命令
    const run = async () => {
      this.loading.set(true);
      try {
        for (const item of todo) {
          await new Promise<void>((resolve, reject) => {
            this.api.install(this.projectId(), { name: item.name, group: item.group, target: "required" }).subscribe({
              next: () => resolve(),
              error: (e) => reject(e),
            });
          });
        }
        this.msg.success("已完成安装");
        this.refresh();
      } catch (e: any) {
        this.msg.error(e?.message || "批量安装失败");
      } finally {
        this.loading.set(false);
      }
    };
    run();
  }

  trackByName(_: number, item: DepItem) {
    return item.group + ":" + item.name;
  }
}
