import { Pipe, type PipeTransform } from '@angular/core';

@Pipe({ name: 'formatSize', standalone: true, pure: true })
export class FormatSizePipe implements PipeTransform {
  transform(size?: number | null): string {
    const value = Number(size ?? 0);
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / 1024 / 1024).toFixed(2)} MB`;
  }
}

@Pipe({ name: 'formatRatio', standalone: true, pure: true })
export class FormatRatioPipe implements PipeTransform {
  transform(value?: number | null): string {
    return `${((value ?? 0) * 100).toFixed(1)}%`;
  }
}

@Pipe({ name: 'formatTime', standalone: true, pure: true })
export class FormatTimePipe implements PipeTransform {
  transform(value?: number | null): string {
    if (!value) return '-';
    return new Date(value).toLocaleTimeString();
  }
}

@Pipe({ name: 'formatMs', standalone: true, pure: true })
export class FormatMsPipe implements PipeTransform {
  transform(value?: number | null): string {
    if (typeof value !== 'number') return '-';
    return value >= 1000 ? `${(value / 1000).toFixed(2)}s` : `${value}ms`;
  }
}
