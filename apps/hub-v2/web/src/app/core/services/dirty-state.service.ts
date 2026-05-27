import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DirtyStateService {
  private readonly dirtySources = new Set<string>();

  markDirty(source: string): void {
    this.dirtySources.add(source);
  }

  markClean(source: string): void {
    this.dirtySources.delete(source);
  }

  clear(): void {
    this.dirtySources.clear();
  }

  hasDirty(): boolean {
    return this.dirtySources.size > 0;
  }
}
