import { Component, input } from '@angular/core';
import { NzCardModule } from 'ng-zorro-antd/card';

@Component({
  selector: 'app-detail-item-card',
  imports: [NzCardModule],
  template: `
    <nz-card class="detail-item" [style]="{ maxHeight: maxHeight() }">
      @if (title()) {
        <h2 class="wrap-title">{{ title() }}</h2>
      }
      <div class="content">
        <ng-content></ng-content>
      </div>
    </nz-card>
  `,
  styles: `
    .detail-item {
      height: 100%;
      width: 100%;
      display: flex;
      flex-direction: column;
      margin-bottom: 1rem;
    }
    .wrap-title {
      width: 100%;
      margin-bottom: 12px;
      font-size: 18px;
      font-weight: bold;
      border-bottom: 1px solid #f0f0f0;
    }

    :host ::ng-deep .ant-card-body {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .content {
      overflow-y: auto;
      // height: 100%;
      flex: 1;
      // min-height: 0;
    }

    :host ::ng-deep .ant-card-bordered{
      border-radius: 10px;
    }
  `,
})
export class DetailItemCardComponent {
  readonly title = input<string>();
  readonly maxHeight = input<string>();
}
