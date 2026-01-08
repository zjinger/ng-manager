import { HttpParams } from "@angular/common/http";
import { Injectable, computed, signal } from "@angular/core";
import { ApiClient } from "@core/api/api-client";
import type { FsEntry, FsListResult } from "@models/fs.model";

type PathSeg = {
  key: string;
  label: string;
  fullPath: string;
  disabled?: boolean;
};

@Injectable({ providedIn: "root" })
export class FsService {
  constructor(private api: ApiClient) { }

  /* ---------------- state ---------------- */
  // 输入框 path（用户可编辑）
  readonly path = signal<string>("d:\\");
  // 服务端返回的 realpath（更可信）
  readonly currentPath = signal<string>("");
  readonly entries = signal<FsEntry[]>([]);
  readonly reloading = signal<boolean>(false);

  readonly isEditingPath = signal<boolean>(false);
  readonly showSystemFolders = signal<boolean>(false);

  // 新建目录 UI
  readonly isCreateFolderModalVisible = signal<boolean>(false);
  readonly newFolderName = signal<string>("");

  // 新增 导入文件夹: 当前路径是否可导入
  // readonly isCurPathCanImport = signal<boolean>(false);

  // breadcrumb
  readonly segments = computed<PathSeg[]>(() => {
    const p = this.currentPath() || this.path() || "";
    return this.buildSegments(p);
  });

  /* ---------------- api ---------------- */
  ls(dirPath: string, showSystem = false) {
    const params = new HttpParams()
      .set("path", dirPath)
      .set("showSystem", showSystem ? "1" : "0");
    return this.api.get<FsListResult>("/api/fs/ls", params);
  }

  mkdir(dirPath: string, folderName: string) {
    return this.api.post<void>("/api/fs/mkdir", { path: dirPath, name: folderName });
  }

  /* ---------------- actions ---------------- */

  /** 初始化/刷新 */
  load() {
    const p = (this.path() || "").trim();
    if (!p) return;

    this.reloading.set(true);
    this.isEditingPath.set(false);

    this.ls(p, this.showSystemFolders()).subscribe({
      next: (res) => {
        this.currentPath.set(res.path);
        this.entries.set(res.entries);
        // path 规范化回写（保持 UI 输入同步）
        this.path.set(res.path);
      },
      complete: () => {
        this.reloading.set(false);
      },
    });
  }

  toggleShowSystemFolders() {
    this.showSystemFolders.update((v) => !v);
    this.load();
  }

  editPath() {
    this.isEditingPath.update((v) => !v);
  }

  /** 进入目录 */
  open(entry: FsEntry) {
    if (entry.type !== "dir") return;
    this.path.set(entry.fullPath);
    this.load();
  }

  /** 返回上一级 */
  up() {
    const cur = this.currentPath();
    if (!cur) return;

    const next = cur.replace(/[\\\/][^\\\/]+$/, "");
    if (next && next !== cur) {
      this.path.set(next);
      this.load();
    }
  }

  /** breadcrumb 跳转 */
  jumpTo(seg: PathSeg) {
    if (seg.disabled) return;
    this.path.set(seg.fullPath);
    this.load();
  }

  /** 打开新建文件夹 modal */
  openCreateFolderModal() {
    this.newFolderName.set("");
    this.isCreateFolderModalVisible.set(true);
  }

  cancelCreateFolder() {
    this.isCreateFolderModalVisible.set(false);
    this.newFolderName.set("");
  }

  /** 确认创建 */
  confirmCreateFolder() {
    const name = (this.newFolderName() || "").trim();
    if (!name) return;

    const parentPath = this.currentPath() || this.path();
    this.mkdir(parentPath, name).subscribe(() => {
      this.isCreateFolderModalVisible.set(false);
      this.newFolderName.set("");
      this.load();
    });
  }

  /* ---------------- breadcrumb utils ---------------- */
  private buildSegments(raw: string): PathSeg[] {
    const p = (raw || "").trim();
    if (!p) return [];

    const isWin = /^[a-zA-Z]:[\\/]/.test(p) || /^[a-zA-Z]:$/.test(p);
    const sep = isWin ? "\\" : "/";

    const norm = isWin ? p.replaceAll("/", "\\") : p.replaceAll("\\", "/");

    let rootLabel = isWin ? norm.slice(0, 2) : "/";
    let rest = norm;

    if (isWin) {
      const m = norm.match(/^([a-zA-Z]:)(?:[\\\/])?(.*)$/);
      if (m) {
        rootLabel = m[1];
        rest = m[2] || "";
      }
    } else {
      rest = norm.startsWith("/") ? norm.slice(1) : norm;
    }

    const parts = rest.split(isWin ? /[\\]+/ : /[\/]+/).filter(Boolean);

    const segs: PathSeg[] = [];
    const rootFull = isWin ? `${rootLabel}\\` : "/";

    segs.push({
      key: "root",
      label: rootLabel,
      fullPath: rootFull,
      disabled: parts.length === 0,
    });

    let acc = rootFull;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      acc = acc.endsWith(sep) ? acc + part : acc + sep + part;

      const isLast = i === parts.length - 1;
      const fullPath = isLast ? acc : acc + sep;

      segs.push({
        key: `${i}-${part}`,
        label: part,
        fullPath,
        disabled: isLast,
      });
    }

    return segs;
  }
}
