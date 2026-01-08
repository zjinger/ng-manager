import { Injectable } from "@angular/core";

type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };

export interface LocalStateDriver {
  get<T extends JsonValue>(key: string): T | null;
  set<T extends JsonValue>(key: string, value: T): void;
  remove(key: string): void;
}

@Injectable({ providedIn: "root" })
export class LocalStorageDriver implements LocalStateDriver {
  get<T extends JsonValue>(key: string): T | null {
    const raw = localStorage.getItem(key);
    if (raw == null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      // 兼容以前存的纯字符串
      return raw as unknown as T;
    }
  }

  set<T extends JsonValue>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  remove(key: string): void {
    localStorage.removeItem(key);
  }
}

/**
 * LocalStateStore
 * - 统一管理本地“UI状态 / 用户偏好 / 最近使用”等信息
 * - 后续可替换 driver 为 indexedDB/sqlite/后端core
 */
@Injectable({ providedIn: "root" })
export class LocalStateStore {
  constructor(private driver: LocalStorageDriver) { }

  get<T extends JsonValue>(key: string, fallback: T): T {
    const v = this.driver.get<T>(key);
    return (v ?? fallback) as T;
  }

  getNullable<T extends JsonValue>(key: string): T | null {
    return this.driver.get<T>(key);
  }

  set<T extends JsonValue>(key: string, value: T): void {
    this.driver.set(key, value);
  }

  remove(key: string): void {
    this.driver.remove(key);
  }
}
