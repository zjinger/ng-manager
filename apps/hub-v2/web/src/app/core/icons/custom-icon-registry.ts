import { Injectable } from '@angular/core';
import { NzIconService } from 'ng-zorro-antd/icon';
import { AIRPLANE_ICON } from './custom-icons';

@Injectable({ providedIn: 'root' })
export class CustomIconRegistry {
  private inited = false;

  constructor(private icons: NzIconService) {}

  init() {
    if (this.inited) return;
    this.inited = true;

    // 注册为 nzType，可复用
    this.icons.addIconLiteral('custom:airplane', AIRPLANE_ICON);
  }
}
