import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'hubTimeAgo',
  standalone: true
})
export class HubTimeAgoPipe implements PipeTransform {
  transform(value: string | null | undefined, fallback = '-'): string {
    if (!value) {
      return fallback;
    }

    const target = new Date(value).getTime();
    if (Number.isNaN(target)) {
      return fallback;
    }

    const diffMs = Date.now() - target;
    const isFuture = diffMs < 0;
    const absMs = Math.abs(diffMs);
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (absMs < minute) {
      return '刚刚';
    }

    if (absMs < hour) {
      const n = Math.floor(absMs / minute);
      return isFuture ? `${n}分钟后` : `${n}分钟前`;
    }

    if (absMs < day) {
      const n = Math.floor(absMs / hour);
      return isFuture ? `${n}小时后` : `${n}小时前`;
    }

    if (absMs < 30 * day) {
      const n = Math.floor(absMs / day);
      return isFuture ? `${n}天后` : `${n}天前`;
    }

    if (absMs < 365 * day) {
      const n = Math.floor(absMs / (30 * day));
      return isFuture ? `${n}个月后` : `${n}个月前`;
    }

    const n = Math.floor(absMs / (365 * day));
    return isFuture ? `${n}年后` : `${n}年前`;
  }
}
