import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'hubDateTime',
  standalone: true
})
export class HubDateTimePipe implements PipeTransform {
  transform(value: string | null | undefined, fallback = '-'): string {
    if (!value) {
      return fallback;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return fallback;
    }

    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    const hour = `${date.getHours()}`.padStart(2, '0');
    const minute = `${date.getMinutes()}`.padStart(2, '0');

    return `${year}-${month}-${day} ${hour}:${minute}`;
  }
}
