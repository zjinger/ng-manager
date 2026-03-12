import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'hubFileSize',
  standalone: true
})
export class HubFileSizePipe implements PipeTransform {
  transform(value: number | null | undefined, fallback = '-'): string {
    if (value == null || !Number.isFinite(value) || value < 0) {
      return fallback;
    }

    if (value === 0) {
      return '0 B';
    }

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = value;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex += 1;
    }

    const fractionDigits = size >= 100 || unitIndex === 0 ? 0 : size >= 10 ? 1 : 2;
    return `${size.toFixed(fractionDigits)} ${units[unitIndex]}`;
  }
}
