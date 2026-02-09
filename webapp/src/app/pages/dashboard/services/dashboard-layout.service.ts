import { computed, inject, Injectable, signal } from "@angular/core";
import { firstValueFrom } from "rxjs/internal/firstValueFrom";
import { DashboardDocV1, DashboardItem, DashboardItemConfig } from "../dashboard.model";
import { DashboardApiService } from "./dashboard-api.service";
@Injectable({ providedIn: "root" })
export class DashboardLayoutService {
  private api: DashboardApiService = inject(DashboardApiService);

  private _doc = signal<DashboardDocV1 | null>(null);


  items = computed(() => this._doc()?.items ?? []);

  updatedAt = computed(() => this._doc()?.updatedAt ?? 0);

  widgets = signal<DashboardItem[]>([]);

  private saveTimer: any = null;

  async load(projectId: string) {
    try {
      const doc = await firstValueFrom(
        this.api.getInfo(projectId)
      );
      this._doc.set(doc);
      return;
    } catch {
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
    const saved = await firstValueFrom(
      this.api.update(projectId, doc)
    );
    this._doc.set(saved);
    return;
  }

  add(widget: DashboardItem) {
    console.log('add widget', widget);
    const cur = this._doc();
    if (!cur) return;

    this._doc.set({
      ...cur,
      items: [...cur.items, widget],
    });

    setTimeout(() => {
      const { x, y } = widget;
      this.api.addWidget(cur.projectId, {
        widgetKey: widget.key,
        x,
        y,
      }).subscribe(doc => {
        this._doc.set(doc);
        this.getWidgets();
      });
    }, 0);

  }

  remove(widgetId: string) {
    const cur = this._doc();
    if (!cur) return;
    this.api.removeWidget(cur.projectId, widgetId).subscribe(
      doc => {
        this._doc.set(doc);
        this.getWidgets();
      },
    );
  }

  killProcess(port: string) {
    this.api.killPort(Number(port)).subscribe(res => {
      console.log('Killed port', port);
    });
  }

  getWidgets() {
    const cur = this._doc();;
    if (!cur) return;
    this.api.widgets(cur.projectId).subscribe(
      widgets => {
        this.widgets.set(widgets);
      }
    );
  }
  updateConfig(projectId: string, widgetId: string, config: DashboardItemConfig) {
    const cur = this._doc();
    if (!cur) return;
    this.api.updateItemConfig(projectId, widgetId, config).subscribe(
      doc => {
        this._doc.set(doc);
      },
    );
  }
}

