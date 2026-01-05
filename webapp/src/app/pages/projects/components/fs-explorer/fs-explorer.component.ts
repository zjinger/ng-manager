import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FsEntry } from '@models/fs.model';
import { FsService } from '@pages/projects/services/fs.service';
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { AboutRoutingModule } from "@pages/about/about-routing-module";
type PathSeg = {
  key: string;
  label: string;
  fullPath: string;
  disabled?: boolean;
};
@Component({
  selector: 'app-fs-explorer',
  imports: [
    CommonModule,
    FormsModule,
    NzInputModule,
    NzButtonModule,
    NzIconModule,
    NzTooltipModule,
    NzDropDownModule,
    NzMenuModule,
    NzSwitchModule,
    NzModalModule,
    AboutRoutingModule
  ],
  templateUrl: './fs-explorer.component.html',
  styleUrl: './fs-explorer.component.less',
})
export class FsExplorerComponent {
  path = "d:\\";
  currentPath = signal<string>("");
  entries = signal<FsEntry[]>([]);
  reloading: boolean = false;
  isEditingPath: boolean = false; // 是否处于编辑路径状态
  showSystemFolders: boolean = false; // 是否显示隐藏文件夹
  isCreateFolderModalVisible: boolean = false; // 新建文件夹对话框显示状态
  newFolderName: string = ""; // 新建文件夹名称
  //  面包屑（根据 currentPath 来算，比 path 更可靠，因为 currentPath 是 realpath）
  segments = computed<PathSeg[]>(() => this.buildSegments(this.currentPath() || this.path || ""));
  constructor(private fs: FsService) { }

  load() {
    const p = (this.path || "").trim();
    if (!p) return;
    this.reloading = true;
    this.isEditingPath = false;
    this.fs.ls(p, this.showSystemFolders).subscribe({
      next: res => {
        this.currentPath.set(res.path);
        this.entries.set(res.entries);
        this.path = res.path; // 规范化后的 realpath 回写
      },
      error: err => {
        console.error("FsExplorer load error:", err);
      },
      complete: () => {
        this.reloading = false;
      }
    });
  }
  toggleShowSystemFolders() {
    this.showSystemFolders = !this.showSystemFolders;
    this.load();
  }

  createFolder() {
    this.isCreateFolderModalVisible = true;
  }
  doCreateFolder() {
    const folderName = this.newFolderName.trim();
    if (!folderName) return;
    const parentPath = this.currentPath() || this.path;
    this.fs.mkdir(parentPath, folderName).subscribe(() => {
      this.isCreateFolderModalVisible = false;
      this.newFolderName = "";
      this.load();
    });
  }
  open(e: FsEntry) {
    if (e.type !== "dir") return;
    this.path = e.fullPath;
    this.load();
  }

  up() {
    const cur = this.currentPath();
    if (!cur) return;
    // 纯字符串处理：Windows/Unix 都兼容的简易写法
    const next = cur.replace(/[\\\/][^\\\/]+$/, "");
    if (next && next !== cur) {
      this.path = next;
      this.load();
    }
  }

  // 点击某一级 folder，直接跳转
  jumpTo(seg: PathSeg) {
    if (seg.disabled) return;
    this.path = seg.fullPath;
    this.load();
  }
  editPath() {
    this.isEditingPath = !this.isEditingPath;
  }
  /* ---------------- breadcrumb utils ---------------- */
  private buildSegments(raw: string): PathSeg[] {
    const path = (raw || "").trim();
    if (!path) return [];

    const isWin = /^[a-zA-Z]:[\\/]/.test(path) || /^[a-zA-Z]:$/.test(path);
    const sep = isWin ? "\\" : "/";

    // 统一分隔符
    const norm = isWin ? path.replaceAll("/", "\\") : path.replaceAll("\\", "/");

    // 处理根
    let rootLabel = isWin ? norm.slice(0, 2) : "/"; // "D:" or "/"
    let rest = norm;

    if (isWin) {
      // D:\a\b => root=D:, rest=a\b
      const m = norm.match(/^([a-zA-Z]:)(?:[\\\/])?(.*)$/);
      if (m) {
        rootLabel = m[1];
        rest = m[2] || "";
      }
    } else {
      // /a/b => rest=a/b
      rest = norm.startsWith("/") ? norm.slice(1) : norm;
    }

    const parts = rest.split(isWin ? /[\\]+/ : /[\/]+/).filter(Boolean);

    const segs: PathSeg[] = [];
    // root 段：Windows 给 "D:"，fullPath 用 "D:\"
    const rootFull = isWin ? `${rootLabel}\\` : "/";

    segs.push({ key: "root", label: rootLabel, fullPath: rootFull, disabled: parts.length === 0 });

    let acc = rootFull; // 一直保持末尾带 sep，拼起来更稳
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      acc = acc.endsWith(sep) ? acc + p : acc + sep + p;

      // 非最后一级保持 trailing slash，方便 server 端处理目录
      const isLast = i === parts.length - 1;
      const fullPath = isLast ? acc : acc + sep;

      segs.push({
        key: `${i}-${p}`,
        label: p,
        fullPath,
        disabled: isLast,
      });
    }

    return segs;
  }
}
