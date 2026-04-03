export class SnapshotHistory<T> {
  private snapshots: string[] = [];
  private index = -1;

  constructor(
    private readonly serialize: (value: T) => string = (value) => JSON.stringify(value),
    private readonly deserialize: (raw: string) => T = (raw) => JSON.parse(raw) as T
  ) {}

  reset(value: T): void {
    this.snapshots = [this.serialize(value)];
    this.index = 0;
  }

  push(value: T): void {
    const snapshot = this.serialize(value);
    this.snapshots = this.snapshots.slice(0, this.index + 1);
    this.snapshots.push(snapshot);
    this.index = this.snapshots.length - 1;
  }

  undo(): T | null {
    if (!this.canUndo) {
      return null;
    }
    this.index -= 1;
    return this.deserialize(this.snapshots[this.index]);
  }

  redo(): T | null {
    if (!this.canRedo) {
      return null;
    }
    this.index += 1;
    return this.deserialize(this.snapshots[this.index]);
  }

  get canUndo(): boolean {
    return this.index > 0;
  }

  get canRedo(): boolean {
    return this.index >= 0 && this.index < this.snapshots.length - 1;
  }
}
