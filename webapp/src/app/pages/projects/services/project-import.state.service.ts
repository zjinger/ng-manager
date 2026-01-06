import { Injectable, inject, signal, computed, effect } from "@angular/core";
import { ImportCheckResult } from "@models/project.model";
import { FsService } from "./fs.service";
import { ProjectService } from "./project.service";
import { ProjectStateService } from "./project.state.service";
import { UiNotifierService } from "@app/core/ui-notifier.service";

@Injectable({ providedIn: "root" })
export class ProjectImportState {
  private fs = inject(FsService);
  private projectApi = inject(ProjectService);
  private projectState = inject(ProjectStateService);

  /** 是否处于 import 页面 */
  readonly active = signal(false);

  readonly checking = signal(false);
  readonly result = signal<ImportCheckResult | null>(null);

  readonly canImport = computed(() => this.result()?.ok === true);
  readonly warnings = computed(() => this.result()?.warnings ?? []);
  readonly reason = computed(() => this.result()?.reason ?? "");

  readonly currentPath = computed(
    () => this.fs.currentPath() || this.fs.path()
  );

  private _seq = 0;

  private notify = inject(UiNotifierService);


  constructor() {
    effect(() => {
      if (!this.active()) return;
      const root = this.currentPath();
      if (!root) return;
      this.check(root);
    });
  }

  enter() {
    this.active.set(true);
  }

  leave() {
    this.active.set(false);
    this.result.set(null);
  }

  check(root: string) {
    const seq = ++this._seq;
    this.checking.set(true);
    this.result.set(null);

    this.projectApi.checkImport(root).subscribe({
      next: (res) => {
        if (seq !== this._seq) return;
        this.result.set(res);
      },
      error: (e) => {
        if (seq !== this._seq) return;
        this.result.set({
          ok: false,
          root,
          reason: e?.message || "check failed",
        } as any);
      },
      complete: () => {
        if (seq !== this._seq) return;
        this.checking.set(false);
      },
    });
  }

  import(name?: string) {
    const root = this.currentPath();
    if (!root || !this.canImport()) return;

    const defaultName =
      root.replace(/[\\\/]+$/, "").split(/[\\\/]/).pop() || "New Project";

    this.projectApi.importByPath({
      root,
      name: name || defaultName,
    }).subscribe({
      next: (res) => {
        this.projectState.getProjects();
        this.projectState.setCurrentProjectById(res.id);
        this.check(root); // 立即刷新为“已注册”
        this.notify.success(`项目导入成功`);
      },
    });
  }
}
