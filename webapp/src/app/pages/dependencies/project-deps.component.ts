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
import { NzPopoverModule } from "ng-zorro-antd/popover";
import { NgDevtoolComponent } from "@app/shared/devtools/ng-devtool.component";
import { PageLayoutComponent } from "@app/shared";
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
    NzPopoverModule,
    NgDevtoolComponent,
    PageLayoutComponent
  ],
  styleUrl: './project-deps.component.less',
  template:`
    <app-page-layout [title]="'项目配置'" [loading]="loading()">
      <ng-container ngProjectAs="actions">
        <app-ng-devtool></app-ng-devtool>
        <nz-input-wrapper>
          <input
            nz-input
            class="search"
            placeholder="搜索"
            [(ngModel)]="keyword"
            (ngModelChange)="keyword.set($event)"
          />
          <nz-icon nzType="search" nzInputPrefix />
        </nz-input-wrapper>
        <!-- <button nz-button nzType="primary">
          <span nz-icon nzType="plus"></span>
          安装依赖
        </button> -->
      </ng-container>
      <div class="panel">
        <!-- Runtime deps -->
        <ng-container
          *ngTemplateOutlet="contentTemplate; context: { $implicit: runtimeItems(), title: '运行依赖' }"
        ></ng-container>
        <nz-divider></nz-divider>
        <!-- Dev deps -->
        <ng-container
          *ngTemplateOutlet="contentTemplate; context: { $implicit: devItems(), title: '开发依赖' }"
        ></ng-container>
      </div>
    </app-page-layout>
    <ng-template #contentTemplate let-items let-title="title">
      <div class="group-title">{{ title }}</div>
      <div class="list">
        @for (item of items; track trackByName($index, item)) {
          <div class="row">
            <div nz-row nzAlign="middle" class="row-inner">
              <!-- left -->
              <div nz-col nzFlex="400px" class="left">
                <div class="pkg-icon">
                  <span nz-icon nzType="appstore"></span>
                </div>
                <div class="pkg">
                  <div class="name">{{ item.name }}</div>
                  <div class="sub">
                    <span>版本 {{ item.current || '-' }}</span>
                    <span class="sep">·</span>
                    <span>要求 {{ item.required || '-' }}</span>
                    <span class="sep">·</span>
                    <span>最新 {{ item.latest || '-' }}</span>
                  </div>
                </div>
              </div>

              <!-- middle -->
              <div nz-col nzFlex="auto" class="mid">
                @if (item.installed) {
                  <nz-tag nzColor="success">已安装</nz-tag>
                } @else {
                  <nz-tag nzColor="warning">未安装</nz-tag>
                }
                <!-- @if(item.hasUpdate){
              <nz-tag nzColor="warning">可更新</nz-tag>
              } -->
                <a class="detail" (click)="openDetail(item)">
                  <span nz-icon nzType="link"></span>
                  查看详情
                </a>
              </div>

              <!-- right -->
              <div nz-col nzFlex="180px" class="right">
                <!-- <button
                nz-button
                nzType="default"
                [nzLoading]="installing()[item.name]"
                (click)="installOrUpdate(item)"
              >
                {{ item.hasUpdate ? '更新' : item.installed ? '重装' : '安装' }}
              </button> -->
                @if (item.hasUpdate || !item.installed) {
                  <button
                    nz-button
                    nzType="text"
                    [nzLoading]="installing()[item.name]"
                    (click)="installOrUpdate(item)"
                    [nz-tooltip]="item.hasUpdate ? '更新到最新版本' : '安装依赖'"
                  >
                    <nz-icon nzType="download" />
                  </button>
                }
                @if (item.installed) {
                  <button
                    nz-button
                    nzType="text"
                    nz-popconfirm
                    nzPopconfirmTitle="确定卸载 {{ item.name }}？"
                    (nzOnConfirm)="uninstall(item)"
                  >
                    <nz-icon nzType="delete" nzTheme="fill" [nz-tooltip]="'卸载' + item.name" />
                  </button>
                }
              </div>
            </div>
          </div>
        }
        @if (items.length === 0) {
          <div class="empty">无数据</div>
        }
      </div>
    </ng-template>
  `
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
    // 直接跳 npm 页面
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
        this.msg.error("批量安装失败");
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
