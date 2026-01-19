import { computed, inject, Injectable, signal } from "@angular/core";
import { LocalStateStore, LS_KEYS } from "@core/local-state";
import { firstValueFrom } from "rxjs/internal/firstValueFrom";
import { DashboardDocV1, DashboardItem } from "../dashboard.model";
import { DashboardApiService } from "./dashboard-api.service";
@Injectable({ providedIn: "root" })
export class DashboardLayoutService {
  private localKey(projectId: string) { return `${LS_KEYS.dashboard.layout}.${projectId}`; }
  private local: LocalStateStore = inject(LocalStateStore);
  private api: DashboardApiService = inject(DashboardApiService);

  private _doc = signal<DashboardDocV1 | null>(null);
  items = computed(() => this._doc()?.items ?? []);
  updatedAt = computed(() => this._doc()?.updatedAt ?? 0);

  widgets = signal<DashboardItem[]>([]);

  private saveTimer: any = null;

  async load(projectId: string) {
    // 1) server first
    try {
      const doc = await firstValueFrom(
        this.api.getInfo(projectId)
      );
      this._doc.set(doc);
      // 同步一份到 local，作为兜底缓存
      this.local.set(this.localKey(projectId), doc);
      return;
    } catch {
      // 2) fallback local
      const cached = this.local.get<DashboardDocV1>(this.localKey(projectId), null as any);
      if (cached) {
        this._doc.set(cached);
        return;
      }
      // 3) 什么都没有：给一个最小默认（理论上不会到这，server 会 getOrCreate）
      this._doc.set({
        version: 1,
        projectId,
        updatedAt: Date.now(),
        items: [],
      });
    }
  }

  setItems(projectId: string, items: DashboardItem[]) {
    const cur = this._doc();
    if (!cur) return;
    this._doc.set({ ...cur, items });
    // 编辑中自动保存（debounce）
    this.scheduleAutoSave(projectId);
  }

  /**
   * 调度一次自动保存（防抖）
   * @param projectId 
   * @param ms 毫秒，默认 10 秒
   */
  scheduleAutoSave(projectId: string, ms = 10_000) {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.flushSave(projectId).catch(() => void 0);
    }, ms);
  }

  async flushSave(projectId: string) {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    const doc = this._doc();
    if (!doc) return;
    // 先写本地兜底（即使 server 失败也能保留）
    this.local.set(this.localKey(projectId), doc);
    const saved = await firstValueFrom(
      this.api.update(projectId, doc)
    );
    this._doc.set(saved);
    this.local.set(this.localKey(projectId), saved);
    return;
  }

  add(widget: DashboardItem) {
    // console.log('add widget', widget);
    const cur = this._doc();
    if (!cur) return;
    this.api.addWidget(cur.projectId, widget.key).subscribe(added => {
      this._doc.set(added);
    });
  }
}

