import { Injectable, computed, inject, signal } from "@angular/core";
import type { FsEntry, FsFavorite } from "@models/fs.model";
import { FsExplorerApiService } from "./fs-explorer-api.service";
import { LocalStateStore, LS_KEYS } from "@core/local-state";

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
  private localState = inject(LocalStateStore);

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

  // 是否可以上退（非根目录且不在加载中）
  readonly canUp = computed(() => !this.reloading() && !this.isRoot());

  /* ---------------- favorites ---------------- */
  // 从 LocalState 初始化
  readonly favorites = signal<FsFavorite[]>(
    this.normalizeFavorites(
      this.localState.get<FsFavorite[]>(LS_KEYS.fs.explorer.favorites, [])
    )
  );
  // 当前路径是否已收藏
  readonly isCurFavorited = computed(() => {
    const p = this.normalizePath(this.currentPath() || this.path() || "");
    if (!p) return false;
    return this.favorites().some((f) => f.path === p);
  });

  /** 添加/取消收藏 */
  toggleFavoriteCurrent() {
    const cur = this.normalizePath(this.currentPath() || this.path() || "");
    if (!cur) return;

    const list = this.favorites();
    const idx = list.findIndex((f) => f.path === cur);

    let next: FsFavorite[];
    if (idx >= 0) {
      // 取消
      next = list.slice(0, idx).concat(list.slice(idx + 1));
    } else {
      // 添加（置顶）
      const fav: FsFavorite = {
        path: cur,
        label: this.buildFavoriteLabel(cur),
        createdAt: Date.now(),
      };
      next = [fav, ...list];
    }

    next = this.normalizeFavorites(next);
    this.favorites.set(next);
    this.persistFavorites(next);
  }

  /** 从收藏跳转 */
  openFavorite(f: FsFavorite) {
    if (!f?.path) return;
    this.path.set(f.path);
    this.load();
  }

  /** 删除某条收藏 */
  removeFavorite(f: FsFavorite) {
    const next = this.normalizeFavorites(
      this.favorites().filter((x) => x.path !== f.path)
    );
    this.favorites.set(next);
    this.persistFavorites(next);
  }

  /** 清空收藏（可选） */
  clearFavorites() {
    this.favorites.set([]);
    this.persistFavorites([]);
  }

  /** 写入 LocalStateStore */
  private persistFavorites(list: FsFavorite[]) {
    this.localState.set(LS_KEYS.fs.explorer.favorites, list);
  }

  /** 兜底：规范化 + 去重 + 排序 */
  private normalizeFavorites(list: FsFavorite[]): FsFavorite[] {
    const map = new Map<string, FsFavorite>();

    for (const it of list || []) {
      const p = this.normalizePath((it as any)?.path || "");
      if (!p) continue;

      map.set(p, {
        path: p,
        label: String((it as any)?.label || this.buildFavoriteLabel(p)).trim(),
        createdAt: Number((it as any)?.createdAt || Date.now()),
      });
    }

    // 最近收藏在前
    return Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  /** label 生成策略：最后一段目录名 / 盘符 / UNC */
  private buildFavoriteLabel(p: string): string {
    const win = p.replaceAll("/", "\\");

    // Windows drive root: D:\ -> D:
    if (/^[a-zA-Z]:\\?$/.test(win)) return win.slice(0, 2);

    // UNC root: \\server\share
    if (/^\\\\[^\\]+\\[^\\]+$/.test(win)) return win;

    // UNC: \\server\share\dir -> dir
    if (/^\\\\/.test(win)) {
      const parts = win.split("\\").filter(Boolean);
      return parts[parts.length - 1] || win;
    }

    // Posix: /a/b -> b ; / -> /
    const posix = p.replaceAll("\\", "/");
    if (posix === "/") return "/";
    const arr = posix.split("/").filter(Boolean);
    return arr[arr.length - 1] || posix;
  }

  /* ---------------- actions ---------------- */

  /** 初始化/刷新 */
  load(force = false) {
    const p = (this.path() || "").trim();
    if (!p) return;

    //  如果 path 与 currentPath 一样，并且 entries 已经有了，就不重复刷
    const cur = (this.currentPath() || "").trim();
    if (cur && this.normalizePath(cur) === this.normalizePath(p) && this.entries().length && !force) {
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
      this.load(true);
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
