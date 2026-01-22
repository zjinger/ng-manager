import { Injectable, signal } from "@angular/core";
import { ConfigCtx, ConfigEditSession, ConfigViewModel } from "../models";

function deepClone<T>(v: T): T {
  return v == null ? v : JSON.parse(JSON.stringify(v));
}

function makeCtxKey(type: string, ctx: ConfigCtx): string {
  return JSON.stringify({
    type,
    project: ctx.project ?? "",
    target: ctx.target ?? "",
    configuration: ctx.configuration ?? "",
    architectKey: ctx.architectKey ?? "",
  });
}

@Injectable({ providedIn: "root" })
export class ConfigEditSessionStore {
  private readonly _sessions = signal<Record<string, ConfigEditSession>>({});
  readonly sessions = this._sessions.asReadonly();

  getSession(type: string): ConfigEditSession | null {
    return this._sessions()[type] ?? null;
  }

  /** keepCurrent=false：切换节点/ctx 时强制重置，避免串写 */
  start(type: string, vm: ConfigViewModel, opts?: { keepCurrent?: boolean }) {
    const keepCurrent = opts?.keepCurrent ?? false;

    const prev = this._sessions()[type];
    const nextKey = makeCtxKey(type, vm.ctx);
    const nextValues = deepClone(vm.values ?? {});

    const next: ConfigEditSession = (() => {
      if (prev && makeCtxKey(type, prev.ctx) === nextKey && keepCurrent) {
        return {
          ...prev,
          filePath: vm.filePath,
          options: vm.options ?? {},
          baseline: deepClone(nextValues),
          updatedAt: Date.now(),
        };
      }
      return {
        fileType: type,
        filePath: vm.filePath,
        ctx: vm.ctx,
        options: vm.options ?? {},
        baseline: deepClone(nextValues),
        current: deepClone(nextValues),
        updatedAt: Date.now(),
      };
    })();

    this._sessions.update((m) => ({ ...m, [type]: next }));
  }

  setCurrent(type: string, values: Record<string, any>) {
    const s = this._sessions()[type];
    if (!s) return;
    this._sessions.update((m) => ({
      ...m,
      [type]: { ...s, current: deepClone(values ?? {}), updatedAt: Date.now() },
    }));
  }

  commit(type: string) {
    const s = this._sessions()[type];
    if (!s) return;
    this._sessions.update((m) => ({
      ...m,
      [type]: { ...s, baseline: deepClone(s.current), updatedAt: Date.now() },
    }));
  }

  isDirty(type: string): boolean {
    const s = this._sessions()[type];
    if (!s) return false;
    let a = JSON.stringify(s.baseline) !== JSON.stringify(s.current);
    console.log('isDirty', type, a);
    return a;
  }

  /** 放弃编辑，删除会话 */
  discard(type: string) {
    this._sessions.update((m) => {
      const next = { ...m };
      delete next[type];
      return next;
    });
  }
}
