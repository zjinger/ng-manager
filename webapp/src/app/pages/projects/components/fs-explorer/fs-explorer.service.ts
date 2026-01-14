import { Injectable, computed, inject, signal } from "@angular/core";
import type { FsEntry } from "@models/fs.model";
import { FsExplorerApiService } from "./fs-explorer-api.service";

export type PathSeg = {
  key: string;
  label: string;
  fullPath: string;
  disabled?: boolean;
};


@Injectable({
  providedIn: 'root',
})
export class FsExplorerService {
  private fsApi = inject(FsExplorerApiService)

  /* ---------------- state ---------------- */
  // 输入框 path（用户可编辑）
  readonly path = signal<string>("D:\\");
  // 服务端返回的 realpath（更可信）
  readonly currentPath = signal<string>("");
  readonly entries = signal<FsEntry[]>([]);
  readonly reloading = signal<boolean>(false);

  readonly isEditingPath = signal<boolean>(false);
  readonly showSystemFolders = signal<boolean>(false);

  // 新建目录 UI
  readonly isCreateFolderModalVisible = signal<boolean>(false);
  readonly newFolderName = signal<string>("");

  // breadcrumb
  readonly segments = computed<PathSeg[]>(() => {
    const p = this.currentPath() || this.path() || "";
    return this.buildSegments(p);
  });

  // 当前是否处于根目录（用于禁用“上一级”）
  readonly isRoot = computed(() => {
    const p = (this.currentPath() || this.path() || "").trim();
    if (!p) return true;

    // UNC: \\server\share 视为根
    if (/^\\\\[^\\]+\\[^\\]+$/.test(p.replaceAll("/", "\\"))) return true;

    // Windows drive: D:\ 或 D:
    const win = p.replaceAll("/", "\\");
    if (/^[a-zA-Z]:\\?$/.test(win)) return true;

    // Posix: /
    const posix = p.replaceAll("\\", "/");
    return posix === "/";
  });

  readonly canUp = computed(() => !this.reloading() && !this.isRoot());

  /* ---------------- actions ---------------- */

  /** 初始化/刷新 */
  load() {
    const p = (this.path() || "").trim();
    if (!p) return;

    //  如果 path 与 currentPath 一样，并且 entries 已经有了，就不重复刷
    const cur = (this.currentPath() || "").trim();
    if (cur && this.normalizePath(cur) === this.normalizePath(p) && this.entries().length) {
      this.isEditingPath.set(false);
      return;
    }

    this.reloading.set(true);
    this.isEditingPath.set(false);

    this.fsApi.ls(p, this.showSystemFolders()).subscribe({
      next: (res) => {
        this.currentPath.set(res.path);
        this.entries.set(res.entries);
        this.path.set(res.path);
      },
      error: () => {
        this.reloading.set(false);
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

  /** 返回父级目录，直到根目录停止 */
  up() {
    if (!this.canUp()) return;

    const curRaw = (this.currentPath() || this.path() || "").trim();
    if (!curRaw) return;

    const cur = this.normalizePath(curRaw);

    // 判断 win/unc
    const winCur = cur.replaceAll("/", "\\");
    const isUNC = /^\\\\[^\\]+\\[^\\]+/.test(winCur);
    const isWinDrive = /^[a-zA-Z]:\\/.test(winCur);
    const isWin = isUNC || isWinDrive;
    const sep = isWin ? "\\" : "/";

    // UNC 根：\\server\share 不再上退
    if (isUNC) {
      const m = winCur.match(/^\\\\([^\\]+)\\([^\\]+)(?:\\(.*))?$/);
      if (!m) return;
      const root = `\\\\${m[1]}\\${m[2]}`;
      if (winCur === root) return;

      const idx = winCur.lastIndexOf("\\");
      const next = idx <= root.length ? root : winCur.slice(0, idx);
      if (this.normalizePath(next) === this.normalizePath(this.currentPath())) return;

      this.path.set(next);
      this.load();
      return;
    }

    // Windows drive：D:\foo\bar -> D:\foo -> D:\
    if (isWinDrive) {
      const idx = winCur.lastIndexOf("\\");
      if (idx <= 2) {
        const driveRoot = `${winCur.slice(0, 2)}\\`;
        if (this.normalizePath(driveRoot) === this.normalizePath(this.currentPath())) return;
        this.path.set(driveRoot);
        this.load();
        return;
      }

      const next = winCur.slice(0, idx);
      if (this.normalizePath(next) === this.normalizePath(this.currentPath())) return;
      this.path.set(next);
      this.load();
      return;
    }

    // Posix：/a/b -> /a -> /
    const posixCur = cur.replaceAll("\\", "/");
    if (posixCur === "/") return;

    const idx = posixCur.lastIndexOf("/");
    const next = idx <= 0 ? "/" : posixCur.slice(0, idx);

    if (this.normalizePath(next) === this.normalizePath(this.currentPath())) return;
    this.path.set(next);
    this.load();
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

  /** 取消创建 */
  cancelCreateFolder() {
    this.isCreateFolderModalVisible.set(false);
    this.newFolderName.set("");
  }

  /** 确认创建 */
  confirmCreateFolder() {
    const name = (this.newFolderName() || "").trim();
    if (!name) return;

    const parentPath = this.currentPath() || this.path();
    this.fsApi.mkdir(parentPath, name).subscribe(() => {
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

  private normalizePath(raw: string): string {
    const p = (raw || "").trim();
    if (!p) return "";

    // 先判断 win/unc
    const isUNC = /^\\\\[^\\]+\\[^\\]+/.test(p.replaceAll("/", "\\"));
    const isWinDrive = /^[a-zA-Z]:([\\/]|$)/.test(p);
    const isWin = isUNC || isWinDrive;

    let norm = isWin ? p.replaceAll("/", "\\") : p.replaceAll("\\", "/");

    // 去掉末尾分隔符，但保留根
    if (isWinDrive) {
      const drive = norm.slice(0, 2);
      if (norm === drive || norm === `${drive}\\`) return `${drive}\\`;
    }
    if (!isWin && norm === "/") return "/";

    norm = norm.replace(/[\\\/]+$/, "");
    return norm;
  }
}
